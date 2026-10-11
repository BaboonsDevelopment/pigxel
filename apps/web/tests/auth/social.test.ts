import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  google: vi.fn(() => true),
  apple: vi.fn(() => true),
  drive: vi.fn(() => false),
  saveDrive: vi.fn(),
  auth: {
    getUser: vi.fn(),
    signInWithOAuth: vi.fn(),
    linkIdentity: vi.fn(),
    exchangeCodeForSession: vi.fn(),
  },
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: mocks.auth }),
}));
vi.mock("@/lib/auth/apple", () => ({ isAppleSignInAvailable: mocks.apple }));
vi.mock("@/lib/google-drive/server", () => ({
  isGoogleSignInAvailable: mocks.google,
  isDriveAvailable: mocks.drive,
  saveDriveConnection: mocks.saveDrive,
  DRIVE_SCOPE: "https://www.googleapis.com/auth/drive.file",
}));

import { GET as google } from "@/app/auth/google/route";
import { GET as apple } from "@/app/auth/apple/route";
import { GET as callback } from "@/app/auth/callback/route";

const user = { id: "artist", identities: [{ provider: "email" }] };
const visit = (path: string) => new NextRequest(`http://localhost:3000${path}`);
const location = (response: Response) => response.headers.get("location");

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_URL", "http://localhost:3000");
  mocks.google.mockReturnValue(true);
  mocks.apple.mockReturnValue(true);
  mocks.drive.mockReturnValue(false);
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
});

describe("Supabase social sign-in", () => {
  it("starts basic Google login without requesting Drive permissions", async () => {
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

  it("never stores an Apple refresh token as Drive even with a Google identity", async () => {
    mocks.drive.mockReturnValue(true);
    mocks.auth.exchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          user: {
            ...user,
            identities: [{ provider: "google" }, { provider: "apple" }],
          },
          provider_refresh_token: "apple-refresh",
        },
      },
      error: null,
    });
    await callback(visit("/auth/callback?code=apple&provider=apple"));
    expect(mocks.saveDrive).not.toHaveBeenCalled();
  });

  it("keeps a valid Google session when storing Drive access fails", async () => {
    mocks.drive.mockReturnValue(true);
    mocks.auth.exchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          user: {
            ...user,
            identities: [
              {
                provider: "google",
                identity_data: { email: "artist@example.com" },
              },
            ],
          },
          provider_refresh_token: "google-refresh",
        },
      },
      error: null,
    });
    mocks.saveDrive.mockRejectedValue(new Error("database unavailable"));
    const response = await callback(
      visit(
        "/auth/callback?code=google&provider=google&next=/settings/account",
      ),
    );
    expect(location(response)).toBe(
      "http://localhost:3000/settings/account?drive=error",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
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
