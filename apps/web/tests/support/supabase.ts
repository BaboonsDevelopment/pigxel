/**
 * An in-memory stand-in for the Supabase client. Queries can be chained in any
 * order; each one resolves to the result configured for its table, RPC or
 * storage bucket, and is recorded so tests can check what was asked.
 *
 *   vi.mock("@/lib/supabase/server", async () =>
 *     (await import("@test/supabase")).supabaseModules.server);
 *
 *   supabase.signIn(aUser());
 *   supabase.respond("tiles", { data: [row] });
 *   supabase.respond("tiles.insert", { error: { message: "denied" } });
 *   expect(supabase.callsTo("tiles")[0]?.filters).toContainEqual(["eq", "id", "t1"]);
 *
 * The fake does not filter rows or enforce row-level security; tests that
 * need real database behaviour belong in tests/db against local Supabase.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { vi } from "vitest";

const SUPABASE_TEST_URL = "http://supabase.test";

type Filter = [method: string, ...args: unknown[]];
type FakeError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};
type FakeResult = {
  data?: unknown;
  error?: FakeError | null;
  count?: number | null;
};

type QueryOp = "select" | "insert" | "update" | "upsert" | "delete";
type QueryCall = {
  kind: "query";
  table: string;
  op: QueryOp;
  /** Columns passed to select(), including select() after a write. */
  columns?: string;
  /** Rows or values passed to insert(), update() or upsert(). */
  values?: unknown;
  options?: Record<string, unknown>;
  /** Every other chained call, in order: ["eq", "id", "t1"], ["single"]… */
  filters: Filter[];
};
type RpcCall = {
  kind: "rpc";
  fn: string;
  args: unknown;
  options?: Record<string, unknown>;
  filters: Filter[];
};
type StorageCall = {
  kind: "storage";
  bucket: string;
  op: string;
  args: unknown[];
};
type Call = QueryCall | RpcCall | StorageCall;

type Responder = FakeResult | ((call: Call) => FakeResult);

const WRITES = new Set(["insert", "update", "upsert", "delete"]);

/** "tiles", "tiles.insert", "rpc:search_public_tiles", "storage:assets.upload" */
function keysFor(call: Call): string[] {
  if (call.kind === "query") return [`${call.table}.${call.op}`, call.table];
  if (call.kind === "rpc") return [`rpc:${call.fn}`];
  return [`storage:${call.bucket}.${call.op}`, `storage:${call.bucket}`];
}

function noRows(): FakeError {
  return {
    code: "PGRST116",
    message: "JSON object requested, multiple (or no) rows returned",
  };
}

/** Applies single() / maybeSingle() / head the way PostgREST would. */
function shape(call: QueryCall | RpcCall, result: FakeResult) {
  const has = (name: string) => call.filters.some(([m]) => m === name);
  let { data = call.kind === "query" && call.op === "select" ? [] : null } =
    result;
  let error = result.error ?? null;
  if (!error && Array.isArray(data) && (has("single") || has("maybeSingle"))) {
    if (data.length === 1) data = data[0];
    else if (data.length === 0 && has("maybeSingle")) data = null;
    else [data, error] = [null, noRows()];
  }
  const count =
    result.count ??
    (call.options?.count && Array.isArray(result.data)
      ? result.data.length
      : null);
  if (call.options?.head) data = null;
  if (error) data = null;
  return {
    data,
    error,
    count,
    status: error ? (error.status ?? 400) : 200,
    statusText: error ? "Bad Request" : "OK",
  };
}

function defaultStorageResult(call: StorageCall): FakeResult {
  const [path] = call.args as [string];
  switch (call.op) {
    case "upload":
    case "update":
      return {
        data: {
          path,
          id: `${call.bucket}/${path}`,
          fullPath: `${call.bucket}/${path}`,
        },
      };
    case "download":
      return { data: new Blob([]) };
    case "createSignedUrl":
      return {
        data: {
          signedUrl: `${SUPABASE_TEST_URL}/storage/v1/object/sign/${call.bucket}/${path}?token=test`,
        },
      };
    case "remove":
    case "list":
      return { data: [] };
    default:
      return { data: null };
  }
}

function createSupabaseFake() {
  const sticky = new Map<string, Responder>();
  const queued = new Map<string, Responder[]>();
  const calls: Call[] = [];
  let user: User | null = null;

  function resultFor(call: Call): FakeResult | undefined {
    calls.push(call);
    for (const key of keysFor(call)) {
      const responder = queued.get(key)?.shift() ?? sticky.get(key);
      if (responder)
        return typeof responder === "function" ? responder(call) : responder;
    }
    return undefined;
  }

  /** A thenable that records every chained call and resolves when awaited. */
  function chain(call: QueryCall | RpcCall) {
    let started = call.kind === "rpc";
    const builder: object = new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === "then") {
            const settle = async () => {
              const result = shape(call, resultFor(call) ?? {});
              const throws = call.filters.some(([m]) => m === "throwOnError");
              if (throws && result.error) throw result.error;
              return result;
            };
            return (
              resolve: (value: unknown) => unknown,
              reject: (reason: unknown) => unknown,
            ) => settle().then(resolve, reject);
          }
          if (typeof prop !== "string") return undefined;
          return (...args: unknown[]) => {
            if (call.kind === "query" && !started && prop === "select") {
              call.columns = args[0] as string | undefined;
              call.options = args[1] as Record<string, unknown> | undefined;
              started = true;
            } else if (call.kind === "query" && !started && WRITES.has(prop)) {
              call.op = prop as QueryOp;
              if (prop === "delete")
                call.options = args[0] as Record<string, unknown> | undefined;
              else {
                call.values = args[0];
                call.options = args[1] as Record<string, unknown> | undefined;
              }
              started = true;
            } else if (call.kind === "query" && prop === "select") {
              call.columns = args[0] as string | undefined;
            } else call.filters.push([prop, ...args]);
            return builder;
          };
        },
      },
    );
    return builder;
  }

  function bucket(name: string) {
    return new Proxy(
      {},
      {
        get(_, op) {
          if (typeof op !== "string" || op === "then") return undefined;
          if (op === "getPublicUrl")
            return (path: string) => ({
              data: {
                publicUrl: `${SUPABASE_TEST_URL}/storage/v1/object/public/${name}/${path}`,
              },
            });
          return async (...args: unknown[]) => {
            const call: StorageCall = {
              kind: "storage",
              bucket: name,
              op,
              args,
            };
            const result = resultFor(call) ?? defaultStorageResult(call);
            const error = result.error ?? null;
            return { data: error ? null : (result.data ?? null), error };
          };
        },
      },
    );
  }

  const session = (u: User) => ({
    access_token: `test-access-${u.id}`,
    refresh_token: `test-refresh-${u.id}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: u,
  });
  const missingSession: FakeError & { name: string } = {
    name: "AuthSessionMissingError",
    message: "Auth session missing!",
    status: 400,
  };
  type SessionResult = {
    data: { user: User | null; session: ReturnType<typeof session> | null };
    error: FakeError | null;
  };
  const signedIn = (u: User): SessionResult => ({
    data: { user: u, session: session(u) },
    error: null,
  });
  const noSession = (): SessionResult => ({
    data: { user: null, session: null },
    error: missingSession,
  });
  const withEmail = ({ email }: { email?: string }) =>
    (user = user ?? aUser(email ? { email } : {}));

  const auth = {
    getUser: vi.fn(async () =>
      user
        ? { data: { user }, error: null }
        : { data: { user: null }, error: missingSession },
    ),
    getClaims: vi.fn(async () =>
      user
        ? {
            data: {
              claims: {
                sub: user.id,
                email: user.email,
                role: "authenticated",
              },
            },
            error: null,
          }
        : { data: null, error: null },
    ),
    getSession: vi.fn(async () => ({
      data: { session: user ? session(user) : null },
      error: null,
    })),
    signInWithPassword: vi.fn(async (credentials: { email?: string }) =>
      signedIn(withEmail(credentials)),
    ),
    signUp: vi.fn(async (credentials: { email?: string }) =>
      signedIn(withEmail(credentials)),
    ),
    signOut: vi.fn(async () => {
      user = null;
      return { error: null };
    }),
    updateUser: vi.fn(async (attributes: Partial<User>) => {
      if (!user) return { data: { user: null }, error: missingSession };
      user = { ...user, ...attributes };
      return { data: { user }, error: null };
    }),
    exchangeCodeForSession: vi.fn(async () =>
      user ? signedIn(user) : noSession(),
    ),
    verifyOtp: vi.fn(async () => (user ? signedIn(user) : noSession())),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
    signInWithOAuth: vi.fn(async ({ provider }: { provider: string }) => ({
      data: {
        provider,
        url: `${SUPABASE_TEST_URL}/auth/v1/authorize?provider=${provider}`,
      },
      error: null,
    })),
    linkIdentity: vi.fn(async ({ provider }: { provider: string }) => ({
      data: {
        provider,
        url: `${SUPABASE_TEST_URL}/auth/v1/authorize?provider=${provider}`,
      },
      error: null,
    })),
    unlinkIdentity: vi.fn(async () => ({ data: {}, error: null })),
    getUserIdentities: vi.fn(async () => ({
      data: { identities: user?.identities ?? [] },
      error: null,
    })),
  };

  const client = {
    from: (table: string) =>
      chain({ kind: "query", table, op: "select", filters: [] }),
    rpc: (fn: string, args?: unknown, options?: Record<string, unknown>) =>
      chain({ kind: "rpc", fn, args, options, filters: [] }),
    storage: { from: bucket },
    auth,
  } as unknown as SupabaseClient;

  return {
    client,
    auth,
    get user() {
      return user;
    },
    signIn(next: User = aUser()) {
      user = next;
      return next;
    },
    signOut() {
      user = null;
    },
    /** Answers every matching call until reset. */
    respond(target: string, result: Responder) {
      sticky.set(target, result);
    },
    /** Answers the next matching call only; queued answers come first. */
    respondOnce(target: string, result: Responder) {
      queued.set(target, [...(queued.get(target) ?? []), result]);
    },
    /** Calls recorded for a target: "tiles", "tiles.insert", "rpc:fn", "storage:bucket". */
    callsTo(target: string): Call[] {
      return calls.filter((call) => keysFor(call).includes(target));
    },
    reset() {
      sticky.clear();
      queued.clear();
      calls.length = 0;
      user = null;
      Object.values(auth).forEach((mock) => mock.mockReset());
    },
  };
}

/** One fake per test file, reset after every test by tests/support/setup.ts. */
export const supabase = createSupabaseFake();

/** Factories for vi.mock(): swap the app's Supabase clients for the fake. */
export const supabaseModules = {
  server: { createClient: async () => supabase.client },
  browser: { createClient: () => supabase.client },
  admin: {
    createAdminClient: () => supabase.client,
    isSupabaseAdminConfigured: () => true,
  },
  ssr: {
    createServerClient: () => supabase.client,
    createBrowserClient: () => supabase.client,
  },
};

/** Sets the env the app checks before talking to Supabase. */
export function stubSupabaseEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_TEST_URL);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret-key");
}

let users = 0;

/** A signed-up Supabase user; override any field. */
export function aUser(overrides: Partial<User> = {}): User {
  users += 1;
  const id = overrides.id ?? `user-${users}`;
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: `${id}@pigxel.test`,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
