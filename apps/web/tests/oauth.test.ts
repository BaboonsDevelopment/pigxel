import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  google: vi.fn(() => true),
  apple: vi.fn(() => true),
  auth: {
    getUser: vi.fn(),
    signInWithOAuth: vi.fn(),
    linkIdentity: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    updateUser: vi.fn(),
  },
  insert: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: mocks.auth,
    from: () => ({ insert: mocks.insert }),
  }),
}));
vi.mock("@/lib/auth/apple", () => ({ isAppleSignInAvailable: mocks.apple }));
vi.mock("@/lib/auth/google", () => ({
  isGoogleSignInAvailable: mocks.google,
}));

import { GET as google } from "@/app/auth/google/route";
import { GET as apple } from "@/app/auth/apple/route";
import { GET as callback } from "@/app/auth/callback/route";
import { loginUrl, safeNext, withParam } from "@/lib/auth/routes";
import { LEGAL_VERSION } from "@/features/legal/legal";

const user = { id: "artist", identities: [{ provider: "email" }] };
const visit = (path: string) => new NextRequest(`http://localhost:3000${path}`);
const location = (response: Response) => response.headers.get("location");

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_URL", "http://localhost:3000");
  mocks.google.mockReturnValue(true);
  mocks.apple.mockReturnValue(true);
  mocks.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mocks.auth.signInWithOAuth.mockResolvedValue({
    data: { url: "https://supabase.test/auth/v1/authorize" },
    error: null,
  });
  mocks.auth.linkIdentity.mockResolvedValue({
    data: { url: "https://supabase.test/auth/v1/authorize?link" },
    error: null,
  });
  mocks.auth.exchangeCodeForSession.mockResolvedValue({
    data: { session: { user } },
    error: null,
  });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.auth.updateUser.mockResolvedValue({ error: null });
});

describe("Supabase social sign-in", () => {
  it("starts Google login asking only for sign-in, not Google Drive", async () => {
    const response = await google(visit("/auth/google?next=/home"));
    expect(location(response)).toBe("https://supabase.test/auth/v1/authorize");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "http://localhost:3000/auth/callback?next=%2Fhome&provider=google",
      },
    });
  });

  it("starts Apple login with a provider-marked PKCE callback", async () => {
    await apple(visit("/auth/apple?next=//untrusted.example"));
    expect(mocks.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "apple",
      options: {
        redirectTo:
          "http://localhost:3000/auth/callback?next=%2Fhome&provider=apple",
      },
    });
  });

  it.each([
    ["google", google],
    ["apple", apple],
  ] as const)(
    "links %s to the current account instead of starting a separate login",
    async (provider, route) => {
      mocks.auth.getUser.mockResolvedValue({ data: { user }, error: null });
      const response = await route(
        visit(`/auth/${provider}?next=/settings/account`),
      );
      expect(location(response)).toContain("?link");
      expect(mocks.auth.linkIdentity).toHaveBeenCalledWith({
        provider,
        options: {
          redirectTo: `http://localhost:3000/auth/callback?next=%2Fsettings%2Faccount&provider=${provider}`,
        },
      });
      expect(mocks.auth.signInWithOAuth).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["google", google],
    ["apple", apple],
  ] as const)(
    "returns already linked %s accounts without linking again",
    async (provider, route) => {
      mocks.auth.getUser.mockResolvedValue({
        data: { user: { ...user, identities: [{ provider }] } },
      });
      expect(
        location(
          await route(visit(`/auth/${provider}?next=/settings/account`)),
        ),
      ).toBe("http://localhost:3000/settings/account");
      expect(mocks.auth.linkIdentity).not.toHaveBeenCalled();
      expect(mocks.auth.signInWithOAuth).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["google", google],
    ["apple", apple],
  ] as const)(
    "handles %s transport failures and unavailable provider configuration",
    async (provider, route) => {
      mocks.auth.signInWithOAuth.mockRejectedValue(new Error("network"));
      const response = await route(visit(`/auth/${provider}`));
      expect(location(response)).toBe(
        `http://localhost:3000/login?error=${provider}`,
      );
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      mocks[provider].mockReturnValue(false);
      mocks.auth.signInWithOAuth.mockClear();
      expect(location(await route(visit(`/auth/${provider}`)))).toBe(
        `http://localhost:3000/login?error=${provider}`,
      );
      expect(mocks.auth.signInWithOAuth).not.toHaveBeenCalled();
    },
  );

  it("does not redirect to a returned URL when Supabase reports an OAuth error", async () => {
    mocks.auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://supabase.test/auth/v1/authorize" },
      error: { message: "disabled" },
    });
    expect(location(await google(visit("/auth/google")))).toBe(
      "http://localhost:3000/login?error=google",
    );
  });

  it("returns failed identity linking to account settings", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mocks.auth.linkIdentity.mockRejectedValue(
      new Error("manual linking disabled"),
    );
    expect(
      location(await apple(visit("/auth/apple?next=/settings/account"))),
    ).toBe("http://localhost:3000/settings/account?link=error");
  });
});

describe("OAuth callbacks", () => {
  it.each(["google", "apple"])(
    "exchanges %s codes and rejects external return destinations",
    async (provider) => {
      const response = await callback(
        visit(
          `/auth/callback?code=ok&provider=${provider}&next=https://untrusted.example`,
        ),
      );
      expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledWith(
        "ok",
        undefined,
      );
      expect(location(response)).toBe("http://localhost:3000/home");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    },
  );

  it.each(["google", "apple"])(
    "shows %s errors for expired exchanges instead of recovery errors",
    async (provider) => {
      mocks.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: "expired" },
      });
      expect(
        location(
          await callback(
            visit(`/auth/callback?code=expired&provider=${provider}`),
          ),
        ),
      ).toBe(`http://localhost:3000/login?error=${provider}`);
    },
  );

  it("preserves editor project ID when linking fails", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    const response = await callback(
      visit(
        "/auth/callback?provider=google&error=access_denied&next=%2Ftiles%2Fedit%3Fid%3Ddraft-1",
      ),
    );
    expect(location(response)).toBe(
      "http://localhost:3000/tiles/edit?id=draft-1&link=error",
    );
  });

  it("keeps provider errors usable when session lookup also fails", async () => {
    mocks.auth.getUser.mockRejectedValue(new Error("network"));
    const response = await callback(
      visit("/auth/callback?provider=apple&error=access_denied"),
    );
    expect(location(response)).toBe("http://localhost:3000/login?error=apple");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});

describe("return destinations", () => {
  it("only returns to known pages", () => {
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
    expect(withParam("/tiles/edit?id=a", "link", "error")).toBe(
      "/tiles/edit?id=a&link=error",
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
});

describe("terms acceptance on OAuth sign-in", () => {
  const signIn = () =>
    callback(visit("/auth/callback?code=ok&provider=google&next=/home"));

  it("records it once for someone who hasn't accepted this version", async () => {
    mocks.insert.mockResolvedValue({ error: null });
    mocks.auth.updateUser.mockResolvedValue({ error: null });
    expect(location(await signIn())).toBe("http://localhost:3000/home");
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ source: "oauth" }),
    );
    expect(mocks.auth.updateUser).toHaveBeenCalledWith({
      data: { legal_version: LEGAL_VERSION },
    });

    mocks.insert.mockClear();
    mocks.auth.exchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          user: { ...user, user_metadata: { legal_version: LEGAL_VERSION } },
        },
      },
      error: null,
    });
    await signIn();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("still signs people in when recording it fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.insert.mockRejectedValue(new Error("database unavailable"));
    expect(location(await signIn())).toBe("http://localhost:3000/home");
  });
});
