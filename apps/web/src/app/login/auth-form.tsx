"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Input } from "@pigxel/ui/components/input";
import { authenticate } from "./actions";
import type { AuthMode, AuthState } from "@/lib/auth/types";

const labels: Record<AuthMode, string> = {
  login: "Log in",
  signup: "Create account",
  forgot: "Send reset link",
};
const linkStyle = "font-medium text-foreground underline underline-offset-4";

export function AuthForm({
  mode,
  configured,
}: {
  mode: AuthMode;
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(
    authenticate.bind(null, mode),
    {} as AuthState,
  );
  const signup = mode === "signup";
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={state.email}
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={254}
          required
          disabled={pending || !configured}
        />
      </div>
      {(mode === "login" || signup) && (
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={signup ? 8 : 1}
            maxLength={128}
            required
            disabled={pending || !configured}
            aria-describedby={signup ? "password-hint" : undefined}
          />
          {signup && (
            <p id="password-hint" className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          )}
          {mode === "login" && (
            <Link
              className="inline-block text-xs text-muted-foreground underline underline-offset-4"
              href="/login?mode=forgot"
            >
              Forgot password?
            </Link>
          )}
        </div>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          role="status"
          className="rounded-lg border bg-muted p-3 text-sm leading-relaxed"
        >
          {state.message}
        </p>
      )}
      {!configured && (
        <p role="status" className="text-sm text-muted-foreground">
          Sign-in is not available yet. Please try again later.
        </p>
      )}
      <Button className="w-full" disabled={pending || !configured}>
        {pending ? "Please wait…" : labels[mode]}
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        <p>
          {mode === "login" ? (
            <>
              New to Pigxel?{" "}
              <Link className={linkStyle} href="/login?mode=signup">
                Create an account
              </Link>
            </>
          ) : (
            <Link className={linkStyle} href="/login">
              Back to log in
            </Link>
          )}
        </p>
      </div>
    </form>
  );
}
