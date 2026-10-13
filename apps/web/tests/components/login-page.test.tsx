import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirectTo } from "@test/next";
import { renderServerComponent } from "@test/render";
import { aUser, stubSupabaseEnv, supabase } from "@test/supabase";

vi.mock(
  "@/lib/supabase/server",
  async () => (await import("@test/supabase")).supabaseModules.server,
);
vi.mock(
  "next/navigation",
  async () => (await import("@test/next")).navigationModule,
);

import Login from "@/app/login/page";

const open = (params: { mode?: string; error?: string; next?: string } = {}) =>
  renderServerComponent(Login, { searchParams: Promise.resolve(params) });

beforeEach(stubSupabaseEnv);

describe("login page", () => {
  it("sends signed-in people on, but never off-site", async () => {
    supabase.signIn(aUser());
    await expect(open({ next: "https://evil.example/" })).rejects.toThrow(
      redirectTo("/home"),
    );
  });

  it("keeps unsafe destinations out of the form", async () => {
    const { container } = await open({
      mode: "signup",
      next: "//evil.example/steal",
    });
    expect(
      screen.getByRole("heading", { name: "Create your free account" }),
    ).toBeInTheDocument();
    expect(container.querySelector('input[name="next"]')).toHaveValue("/home");
  });

  it("explains why a Google sign-in came back", async () => {
    await open({ error: "google" });
    expect(
      screen.getByText(
        "Google sign-in didn’t finish. Try again, or use your email.",
      ),
    ).toBeInTheDocument();
  });

  it("treats any other error as an expired reset link", async () => {
    await open({ error: "expired" });
    expect(
      screen.getByText(/This link is invalid or has expired/),
    ).toBeInTheDocument();
  });

  it("only asks for an email to reset a password", async () => {
    await open({ mode: "forgot" });
    expect(
      screen.getByRole("heading", { name: "Forgot your password?" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Continue with Google/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("shows sign-in providers as unavailable until they are set up", async () => {
    await open();
    expect(
      screen.getByRole("button", { name: /Continue with Google/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Continue with Apple/ }),
    ).toBeDisabled();
  });
});
