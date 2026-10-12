/**
 * Connection details of the local Supabase that `pnpm db:start` runs in
 * Docker. Database and end-to-end tests create and delete users, so they
 * must never reach the hosted project that apps/web/.env* points at: this
 * only ever returns a Supabase on this machine.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export type LocalSupabase = {
  url: string;
  publishableKey: string;
  secretKey: string;
};

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const ENV = {
  url: "PIGXEL_TEST_SUPABASE_URL",
  publishableKey: "PIGXEL_TEST_SUPABASE_PUBLISHABLE_KEY",
  secretKey: "PIGXEL_TEST_SUPABASE_SECRET_KEY",
} as const;

function assertLocal(url: string) {
  if (!LOCAL_HOSTS.has(new URL(url).hostname))
    throw new Error(
      `Refusing to test against ${url}: tests only run against local Supabase.`,
    );
}

function askCli(): LocalSupabase {
  let status: Record<string, string>;
  try {
    const output = execFileSync(
      "pnpm",
      ["exec", "supabase", "status", "--output", "json"],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30_000,
      },
    );
    status = JSON.parse(output.slice(output.indexOf("{")));
  } catch {
    throw new Error(
      "Local Supabase isn't running. Start it with `pnpm db:start` (needs Docker).",
    );
  }
  const url = status.API_URL;
  const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !secretKey)
    throw new Error("`supabase status` didn't report the API URL and keys.");
  return { url, publishableKey, secretKey };
}

export function localSupabase(): LocalSupabase {
  const url = process.env[ENV.url];
  const publishableKey = process.env[ENV.publishableKey];
  const secretKey = process.env[ENV.secretKey];
  const found =
    url && publishableKey && secretKey
      ? { url, publishableKey, secretKey }
      : askCli();
  assertLocal(found.url);
  // Test workers inherit these, so the CLI is asked once per run.
  process.env[ENV.url] = found.url;
  process.env[ENV.publishableKey] = found.publishableKey;
  process.env[ENV.secretKey] = found.secretKey;
  return found;
}
