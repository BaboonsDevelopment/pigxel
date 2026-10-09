import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
    signInWithOAuth: vi.fn(),
    linkIdentity: vi.fn(),
    exchangeCodeForSession: vi.fn(),
  },
  rows: new Map<string, Record<string, unknown>>(),
  fetch: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: mocks.auth }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  isSupabaseAdminConfigured: () => Boolean(process.env.SUPABASE_SECRET_KEY),
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_: string, id: string) => ({
          maybeSingle: async () => ({ data: mocks.rows.get(id) ?? null }),
        }),
      }),
      upsert: async (row: Record<string, unknown>) => {
        mocks.rows.set(row.user_id as string, row);
        return { error: null };
      },
      delete: () => ({
        eq: async (_: string, id: string) => {
          mocks.rows.delete(id);
          return { error: null };
        },
      }),
    }),
  }),
}));

import { GET as google } from "@/app/auth/google/route";
import { GET as callback } from "@/app/auth/callback/route";
import { POST as token } from "@/app/api/google-drive/token/route";
import { loginUrl, safeNext, withParam } from "@/lib/auth/routes";
import { DRIVE_SCOPE } from "@/lib/google-drive/server";

const emailUser = {
  id: "user-1",
  identities: [{ provider: "email", identity_data: { email: "a@b.co" } }],
};
const googleUser = {
  id: "user-1",
  identities: [
    { provider: "google", identity_data: { email: "person@gmail.com" } },
  ],
};
const location = (response: Response) => response.headers.get("location");

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rows.clear();
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
  vi.stubEnv("SUPABASE_SECRET_KEY", "secret");
  vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
  mocks.auth.getUser.mockResolvedValue({ data: { user: null } });
  mocks.auth.signInWithOAuth.mockResolvedValue({
    data: { url: "https://accounts.google.com/o/oauth2/auth?x" },
  });
  mocks.auth.linkIdentity.mockResolvedValue({
    data: { url: "https://accounts.google.com/o/oauth2/auth?link" },
  });
});

describe("connecting Google", () => {
  it("signs in with Google and asks for Drive with offline access", async () => {
    const response = await google(
      new NextRequest("http://localhost:3000/auth/google?next=/tiles"),
    );
    expect(location(response)).toBe(
      "https://accounts.google.com/o/oauth2/auth?x",
    );
    const { options } = mocks.auth.signInWithOAuth.mock.calls[0]![0];
    expect(options.scopes).toBe(DRIVE_SCOPE);
    expect(options.queryParams.access_type).toBe("offline");
    expect(options.queryParams.prompt).toBeUndefined();
    expect(options.redirectTo).toBe(
      "http://localhost:3000/auth/callback?next=%2Ftiles&provider=google",
    );
  });
  it("links a Google account to an email account", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: emailUser } });
    const response = await google(
      new NextRequest("http://localhost:3000/auth/google?next=/tiles/edit"),
    );
    expect(location(response)).toContain("link");
    const { provider, options } = mocks.auth.linkIdentity.mock.calls[0]![0];
    expect(provider).toBe("google");
    expect(options.queryParams.prompt).toBe("consent");
    expect(options.redirectTo).toContain("next=%2Ftiles%2Fedit");
    expect(mocks.auth.signInWithOAuth).not.toHaveBeenCalled();
  });
  it("asks a Google user again for Drive access", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: googleUser } });
    await google(
      new NextRequest("http://localhost:3000/auth/google?next=/account"),
    );
    expect(mocks.auth.linkIdentity).not.toHaveBeenCalled();
    const { options } = mocks.auth.signInWithOAuth.mock.calls[0]![0];
    expect(options.queryParams.prompt).toBe("consent");
  });
  it("only returns to known pages", async () => {
    await google(
      new NextRequest(
        "http://localhost:3000/auth/google?next=https://evil.example",
      ),
    );
    expect(
      mocks.auth.signInWithOAuth.mock.calls[0]![0].options.redirectTo,
    ).toContain("next=%2Fhome");
    expect(safeNext("/tiles/edit")).toBe("/tiles/edit");
    expect(safeNext("/tiles/edit?id=3f2a-b1")).toBe("/tiles/edit?id=3f2a-b1");
    expect(safeNext("/tiles/edit?id=<script>")).toBe("/tiles/edit");
    expect(safeNext("/settings/account?id=x")).toBe("/settings/account");
    expect(safeNext("/account")).toBe("/home");
    expect(safeNext("/share/8c3d5cb8-ebd3-41eb-a6f4-867a4f842928")).toBe(
      "/share/8c3d5cb8-ebd3-41eb-a6f4-867a4f842928",
    );
    expect(safeNext("/share/x")).toBe("/home");
    expect(safeNext("https://evil.example/tiles/edit")).toBe("/home");
    expect(withParam("/tiles/edit?id=a", "drive", "error")).toBe(
      "/tiles/edit?id=a&drive=error",
    );
    expect(safeNext("//evil.example")).toBe("/home");
    expect(safeNext(null)).toBe("/home");
    expect(safeNext("/pricing")).toBe("/pricing");
    expect(safeNext("/u/pixel_pig")).toBe("/u/pixel_pig");
    expect(safeNext("/u/Not-A-Name")).toBe("/home");
    expect(safeNext("/u/pixel_pig/extra")).toBe("/home");
  });
  it("builds login links that return to a safe page", () => {
    expect(loginUrl()).toBe("/login");
    expect(loginUrl("signup")).toBe("/login?mode=signup");
    expect(loginUrl("signup", "/pricing")).toBe(
      "/login?mode=signup&next=%2Fpricing",
    );
    expect(loginUrl("login", "/pricing")).toBe("/login?next=%2Fpricing");
  });
  it("hides Google sign-in when it isn't set up", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    const response = await google(
      new NextRequest("http://localhost:3000/auth/google"),
    );
    expect(location(response)).toBe("http://localhost:3000/login?error=google");
  });
});

describe("the Google callback", () => {
  const session = (refreshToken: string | null) => ({
    data: {
      session: {
        user: googleUser,
        provider_token: "google-access",
        provider_refresh_token: refreshToken,
      },
    },
    error: null,
  });

  it("keeps the refresh token and returns to the editor", async () => {
    mocks.auth.exchangeCodeForSession.mockResolvedValue(session("refresh-1"));
    const response = await callback(
      new NextRequest(
        "http://localhost:3000/auth/callback?code=c&next=/tiles/edit",
      ),
    );
    expect(location(response)).toBe("http://localhost:3000/tiles/edit");
    expect(mocks.rows.get("user-1")).toMatchObject({
      refresh_token: "refresh-1",
      google_email: "person@gmail.com",
    });
  });
  it("keeps an existing connection when Google sends no new refresh token", async () => {
    mocks.rows.set("user-1", { refresh_token: "old" });
    mocks.auth.exchangeCodeForSession.mockResolvedValue(session(null));
    await callback(
      new NextRequest("http://localhost:3000/auth/callback?code=c"),
    );
    expect(mocks.rows.get("user-1")).toEqual({ refresh_token: "old" });
  });
  it("returns a signed-in person who cancelled at Google to where they were", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: emailUser } });
    const response = await callback(
      new NextRequest(
        "http://localhost:3000/auth/callback?error=access_denied&next=/tiles/new",
      ),
    );
    expect(location(response)).toBe(
      "http://localhost:3000/tiles/new?drive=error",
    );
  });
  it("sends a signed-out person who cancelled back to login", async () => {
    const response = await callback(
      new NextRequest(
        "http://localhost:3000/auth/callback?error=access_denied",
      ),
    );
    expect(location(response)).toBe("http://localhost:3000/login?error=google");
  });
});

describe("Drive access tokens", () => {
  const googleReplies = (status: number, body: unknown) =>
    mocks.fetch.mockResolvedValue(
      new Response(JSON.stringify(body), { status }),
    );

  it("requires a signed-in person", async () => {
    expect((await token()).status).toBe(401);
  });
  it("asks to connect when there is no Google account linked", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: emailUser } });
    const response = await token();
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "not_connected" });
  });
  it("trades the stored refresh token for a short-lived access token", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: googleUser } });
    mocks.rows.set("user-1", { refresh_token: "refresh-1" });
    googleReplies(200, { access_token: "access-1", expires_in: 3599 });
    const response = await token();
    expect(await response.json()).toEqual({
      accessToken: "access-1",
      expiresIn: 3599,
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const [url, init] = mocks.fetch.mock.calls[0]!;
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const sent = new URLSearchParams(init.body);
    expect(sent.get("refresh_token")).toBe("refresh-1");
    expect(sent.get("client_secret")).toBe("client-secret");
  });
  it("forgets a connection that Google has revoked", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: googleUser } });
    mocks.rows.set("user-1", { refresh_token: "revoked" });
    googleReplies(400, { error: "invalid_grant" });
    expect((await token()).status).toBe(409);
    expect(mocks.rows.has("user-1")).toBe(false);
  });
  it("reports Google outages without dropping the connection", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: googleUser } });
    mocks.rows.set("user-1", { refresh_token: "refresh-1" });
    googleReplies(503, { error: "backend_error" });
    expect((await token()).status).toBe(502);
    expect(mocks.rows.has("user-1")).toBe(true);
  });
  it("is unavailable when the server isn't set up for Drive", async () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect((await token()).status).toBe(404);
  });
});
