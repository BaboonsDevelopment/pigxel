import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(() => true),
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    verifyOtp: vi.fn(),
    getClaims: vi.fn(),
  },
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: mocks.auth,
    from: () => {
      const query: Record<string, unknown> = {
        then: (resolve: (value: unknown) => void) =>
          resolve({ data: [], error: null }),
      };
      for (const method of [
        "select",
        "is",
        "eq",
        "not",
        "or",
        "order",
        "range",
        "limit",
      ])
        query[method] = () => query;
      return query;
    },
  }),
}));
vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: mocks.configured,
  supabaseConfig: () => ({ url: "http://supabase.test", key: "test-key" }),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: mocks.auth }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Pixel: () => ({ variable: "" }),
  Pixelify_Sans: () => ({ className: "" }),
  Manrope: () => ({ className: "" }),
  Inter: () => ({ className: "" }),
}));

import { authenticate, signOut, updatePassword } from "@/features/auth/actions";
import { GET as callback } from "@/app/auth/callback/route";
import { GET as confirm } from "@/app/auth/confirm/route";
import AccountSettings from "@/app/(app)/settings/account/page";
import Login from "@/app/login/page";
import UpdatePassword from "@/app/auth/update-password/page";
import Home from "@/app/page";
import { QueryProvider } from "@/components/providers/query-provider";
import Tiles from "@/app/(app)/tiles/page";
import NewTile from "@/app/(app)/tiles/new/page";
import { proxy } from "@/proxy";

function form(
  values: Record<string, string> = {
    email: "person@example.com",
    password: "test-password",
  },
) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
const session = { access_token: "test-session" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_URL", "http://localhost:3000");
  mocks.configured.mockReturnValue(true);
  mocks.auth.signInWithPassword.mockResolvedValue({
    data: { session },
    error: null,
  });
  mocks.auth.signUp.mockResolvedValue({ data: { session }, error: null });
  mocks.auth.signOut.mockResolvedValue({ error: null });
  mocks.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  mocks.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "person@example.com" } },
    error: null,
  });
  mocks.auth.updateUser.mockResolvedValue({ error: null });
  mocks.auth.exchangeCodeForSession.mockResolvedValue({
    data: { session },
    error: null,
  });
  mocks.auth.verifyOtp.mockResolvedValue({ data: { session }, error: null });
  mocks.auth.getClaims.mockResolvedValue({
    data: { claims: { sub: "user-1" } },
    error: null,
  });
});

describe("email/password authentication", () => {
  it("redirects a successful login to Home and refreshes cached UI", async () => {
    await expect(
      authenticate(
        "login",
        {},
        form({ email: " person@example.com ", password: "test-password" }),
      ),
    ).rejects.toThrow("REDIRECT:/home");
    expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "test-password",
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
  });
  it("returns to a safe page after logging in or signing up", async () => {
    const values = { email: "person@example.com", password: "test-password" };
    await expect(
      authenticate("signup", {}, form({ ...values, next: "/pricing" })),
    ).rejects.toThrow("REDIRECT:/pricing");
    await expect(
      authenticate(
        "login",
        {},
        form({ ...values, next: "https://evil.example" }),
      ),
    ).rejects.toThrow("REDIRECT:/home");
  });
  it("keeps rejected credentials on the login form", async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: "invalid_credentials" },
    });
    expect(await authenticate("login", {}, form())).toMatchObject({
      email: "person@example.com",
      error: expect.stringContaining("Unable to log in"),
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("does not treat an empty session as successful authentication", async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    expect(await authenticate("login", {}, form())).toHaveProperty("error");
  });
  it("signs a new account in directly without email confirmation", async () => {
    await expect(authenticate("signup", {}, form())).rejects.toThrow(
      "REDIRECT:/home",
    );
    expect(mocks.auth.signUp).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "test-password",
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
  });
  it("does not grant access when signup returns no session", async () => {
    mocks.auth.signUp.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    expect(await authenticate("signup", {}, form())).toHaveProperty("error");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("tells people when the email is already registered", async () => {
    mocks.auth.signUp.mockResolvedValue({
      data: { session: null },
      error: { status: 422, code: "user_already_exists" },
    });
    expect((await authenticate("signup", {}, form())).error).toContain(
      "already exists",
    );
  });
  it("validates input before calling Supabase", async () => {
    expect(
      await authenticate(
        "login",
        {},
        form({ email: "bad", password: "password" }),
      ),
    ).toHaveProperty("error");
    expect(
      await authenticate(
        "signup",
        {},
        form({ email: "person@example.com", password: "short" }),
      ),
    ).toHaveProperty("error");
    expect(mocks.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.auth.signUp).not.toHaveBeenCalled();
  });
  it("handles missing configuration and network failures", async () => {
    mocks.configured.mockReturnValue(false);
    expect(await authenticate("login", {}, form())).toHaveProperty("error");
    expect(mocks.auth.signInWithPassword).not.toHaveBeenCalled();
    mocks.configured.mockReturnValue(true);
    mocks.auth.signInWithPassword.mockRejectedValue(
      new Error("network failure"),
    );
    expect((await authenticate("login", {}, form())).error).toContain(
      "couldn’t connect",
    );
  });
  it("signs out the current browser and returns to the landing page", async () => {
    await expect(signOut()).rejects.toThrow(/^REDIRECT:\/$/);
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("does not pretend signout worked when Supabase fails", async () => {
    mocks.auth.signOut.mockResolvedValue({ error: { message: "network" } });
    expect(await signOut()).toHaveProperty("error");
  });
});

describe("email recovery", () => {
  it("requests a reset link without a password", async () => {
    expect(
      await authenticate("forgot", {}, form({ email: "person@example.com" })),
    ).toHaveProperty("message");
    expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "person@example.com",
      {
        redirectTo:
          "http://localhost:3000/auth/callback?next=/auth/update-password",
      },
    );
  });
  it("does not reveal whether an account exists", async () => {
    const existing = await authenticate(
      "forgot",
      {},
      form({ email: "person@example.com" }),
    );
    mocks.auth.resetPasswordForEmail.mockResolvedValue({
      error: { status: 400, code: "user_not_found" },
    });
    expect(
      await authenticate("forgot", {}, form({ email: "person@example.com" })),
    ).toEqual(existing);
  });
  it("surfaces email rate limits", async () => {
    mocks.auth.resetPasswordForEmail.mockResolvedValue({
      error: { status: 429 },
    });
    expect(
      (await authenticate("forgot", {}, form({ email: "person@example.com" })))
        .error,
    ).toContain("wait a minute");
  });
  it("requires matching passwords and a verified user before updating", async () => {
    expect(
      await updatePassword(
        {},
        form({ password: "test-password", confirmPassword: "different" }),
      ),
    ).toHaveProperty("error");
    mocks.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(
      await updatePassword(
        {},
        form({ password: "test-password", confirmPassword: "test-password" }),
      ),
    ).toHaveProperty("error");
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  });
  it("updates the authenticated user then returns to the account page", async () => {
    await expect(
      updatePassword(
        {},
        form({ password: "test-password", confirmPassword: "test-password" }),
      ),
    ).rejects.toThrow("REDIRECT:/settings/account?updated=password");
    expect(mocks.auth.updateUser).toHaveBeenCalledWith({
      password: "test-password",
    });
  });
});

describe("email callbacks and route guards", () => {
  it("exchanges PKCE codes and restricts redirect destinations", async () => {
    const response = await callback(
      new NextRequest(
        "http://localhost:3000/auth/callback?code=test&next=https://untrusted.example",
      ),
    );
    expect(response.headers.get("location")).toBe("http://localhost:3000/home");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      "test",
      undefined,
    );
  });
  it("sends recovery callbacks to the password page", async () => {
    const response = await callback(
      new NextRequest(
        "http://localhost:3000/auth/callback?code=test&next=/auth/update-password",
      ),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/update-password",
    );
  });
  it("returns email-change links to account settings", async () => {
    const response = await callback(
      new NextRequest(
        "http://localhost:3000/auth/callback?code=test&next=/settings/account",
      ),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/settings/account",
    );
  });
  it("reports a cancelled Apple link as a linking error, not a Drive one", async () => {
    const response = await callback(
      new NextRequest(
        "http://localhost:3000/auth/callback?error=access_denied&next=/settings/account&provider=apple",
      ),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/settings/account?link=error",
    );
  });
  it("sends a cancelled Apple sign-in back to login", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await callback(
      new NextRequest(
        "http://localhost:3000/auth/callback?error=access_denied&provider=apple",
      ),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=apple",
    );
  });
  it("rejects a failed code exchange", async () => {
    mocks.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: {},
    });
    const response = await callback(
      new NextRequest("http://localhost:3000/auth/callback?code=expired"),
    );
    expect(response.headers.get("location")).toContain(
      "/login?error=confirmation",
    );
  });
  it("verifies recovery tokens", async () => {
    const recovery = await confirm(
      new NextRequest(
        "http://localhost:3000/auth/confirm?token_hash=test&type=recovery",
      ),
    );
    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "test",
      type: "recovery",
    });
    expect(recovery.headers.get("location")).toBe(
      "http://localhost:3000/auth/update-password",
    );
  });
  it("rejects signup confirmation and other token types", async () => {
    for (const query of ["token_hash=test", "token_hash=test&type=invite"]) {
      const response = await confirm(
        new NextRequest(`http://localhost:3000/auth/confirm?${query}`),
      );
      expect(response.headers.get("location")).toContain(
        "/login?error=confirmation",
      );
    }
    expect(mocks.auth.verifyOtp).not.toHaveBeenCalled();
  });
  it("protects account, tiles, and password pages from signed-out users", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(
      AccountSettings({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT:/login");
    await expect(Tiles({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT:/login",
    );
    await expect(
      NewTile({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT:/login");
    await expect(UpdatePassword()).rejects.toThrow(
      "REDIRECT:/login?mode=forgot&error=expired",
    );
  });
  it("redirects signed-in users away from login", async () => {
    await expect(Login({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT:/home",
    );
    await expect(
      Login({ searchParams: Promise.resolve({ next: "/pricing" }) }),
    ).rejects.toThrow("REDIRECT:/pricing");
  });
  it("renders account settings after Supabase verifies the user", async () => {
    const html = renderToStaticMarkup(
      await AccountSettings({
        searchParams: Promise.resolve({ updated: "password" }),
      }),
    );
    expect(mocks.auth.getUser).toHaveBeenCalledOnce();
    expect(html).toContain("person@example.com");
    expect(html).toContain("Your password has been updated.");
    expect(html).toContain("Set a password");
  });
  it("forwards auth codes that arrive at the default Site URL", async () => {
    await expect(
      Home({ searchParams: Promise.resolve({ code: "test" }) }),
    ).rejects.toThrow("REDIRECT:/auth/callback?code=test");
  });
});

describe("proxy", () => {
  const visit = (path: string) =>
    proxy(new NextRequest(`http://localhost:3000${path}`));
  const signedOut = () =>
    mocks.auth.getClaims.mockResolvedValue({
      data: null,
      error: { message: "no session" },
    });

  it("sends signed-out visitors of protected pages to login", async () => {
    signedOut();
    for (const path of [
      "/home",
      "/tiles",
      "/tiles/new",
      "/settings/account",
      "/settings/profile",
      "/profile",
    ]) {
      expect((await visit(path)).headers.get("location")).toBe(
        "http://localhost:3000/login",
      );
    }
    expect((await visit("/auth/update-password")).headers.get("location")).toBe(
      "http://localhost:3000/login?mode=forgot&error=expired",
    );
  });
  it("lets signed-out visitors see public pages", async () => {
    signedOut();
    for (const path of ["/", "/login", "/login?mode=signup", "/u/someone"]) {
      expect((await visit(path)).headers.get("location")).toBeNull();
    }
  });
  it("sends returning signed-in visitors to Home", async () => {
    for (const path of ["/", "/login"]) {
      expect((await visit(path)).headers.get("location")).toBe(
        "http://localhost:3000/home",
      );
    }
    expect((await visit("/tiles")).headers.get("location")).toBeNull();
  });
  it("sends signed-in visitors of login back to where they were going", async () => {
    expect(
      (await visit("/login?next=%2Fpricing")).headers.get("location"),
    ).toBe("http://localhost:3000/pricing");
    expect(
      (await visit("/login?next=https%3A%2F%2Fevil.example")).headers.get(
        "location",
      ),
    ).toBe("http://localhost:3000/home");
  });
  it("still forwards auth codes on the landing page", async () => {
    expect((await visit("/?code=test")).headers.get("location")).toBeNull();
  });
  it("blocks protected pages when Supabase is not configured", async () => {
    mocks.configured.mockReturnValue(false);
    expect((await visit("/tiles")).headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });
});

describe("tiles", () => {
  it("shows My projects to signed-in users", async () => {
    const html = renderToStaticMarkup(
      createElement(
        QueryProvider,
        null,
        await Tiles({ searchParams: Promise.resolve({}) }),
      ),
    );
    expect(html).toMatch(/<h1[^>]*>My projects<\/h1>/);
  });
});
