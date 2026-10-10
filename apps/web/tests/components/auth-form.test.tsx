import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithUser } from "@test/render";

vi.mock("@/features/auth/actions", () => ({ authenticate: vi.fn() }));

import { authenticate } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/components/auth-form";

const submit = vi.mocked(authenticate);

describe("auth form", () => {
  it("sends the email, password and destination to the login action", async () => {
    submit.mockResolvedValue({});
    const { user } = renderWithUser(
      <AuthForm mode="login" configured next="/pricing" />,
    );
    await user.type(screen.getByLabelText("Email"), "artist@pigxel.test");
    await user.type(screen.getByLabelText("Password"), "hunter22");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(submit).toHaveBeenCalledOnce();
    const [mode, , data] = submit.mock.calls[0]!;
    expect(mode).toBe("login");
    expect(Object.fromEntries(data)).toEqual({
      email: "artist@pigxel.test",
      password: "hunter22",
      next: "/pricing",
    });
  });

  it("shows the error and keeps the email after a failed attempt", async () => {
    submit.mockResolvedValue({
      error: "Unable to log in.",
      email: "artist@pigxel.test",
    });
    const { user } = renderWithUser(<AuthForm mode="login" configured />);
    await user.type(screen.getByLabelText("Email"), "artist@pigxel.test");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Unable to log in.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("artist@pigxel.test");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("asks new accounts for a longer password", () => {
    renderWithUser(<AuthForm mode="signup" configured />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("minlength", "8");
    expect(screen.getByText("At least 8 characters.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("only asks for an email to reset a password", () => {
    renderWithUser(<AuthForm mode="forgot" configured />);
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send reset link" }),
    ).toBeInTheDocument();
  });

  it("stays disabled until sign-in is configured", () => {
    renderWithUser(<AuthForm mode="login" configured={false} />);
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Log in" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Sign-in is not available yet.",
    );
  });
});
