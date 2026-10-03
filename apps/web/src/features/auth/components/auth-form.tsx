"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { Notice } from "@pigxel/ui/components/notice";
import { textLinkClassName } from "@pigxel/ui/components/typography";
import { authenticate } from "./actions";
import type { AuthMode, AuthState } from "@/lib/auth/types";

const labels: Record<AuthMode, string> = {
  login: "Log in",
  signup: "Create account",
  forgot: "Send reset link",
};

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
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          inputSize="lg"
          className="h-12 rounded-xl"
          defaultValue={state.email}
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={254}
          required
          disabled={pending || !configured}
        />
      </Field>
      {(mode === "login" || signup) && (
        <Field
          label="Password"
          htmlFor="password"
          hint={signup ? "At least 8 characters." : undefined}
        >
          <Input
            id="password"
            name="password"
            type="password"
            inputSize="lg"
            className="h-12 rounded-xl"
            autoComplete={signup ? "new-password" : "current-password"}
            aria-describedby={signup ? "password-hint" : undefined}
            minLength={signup ? 8 : 1}
            maxLength={128}
            required
            disabled={pending || !configured}
          />
          {mode === "login" && (
            <Link
              className="inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              href="/login?mode=forgot"
            >
              Forgot password?
            </Link>
          )}
        </Field>
      )}
      {state.error && <FormMessage tone="error">{state.error}</FormMessage>}
      {state.message && <Notice>{state.message}</Notice>}
      {!configured && (
        <FormMessage role="status">
          Sign-in is not available yet. Please try again later.
        </FormMessage>
      )}
      <Button
        size="lg"
        className="h-12 w-full rounded-full"
        disabled={pending || !configured}
      >
        {pending ? "Please wait…" : labels[mode]}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            New to Pigxel?{" "}
            <Link className={textLinkClassName} href="/login?mode=signup">
              Create an account
            </Link>
          </>
        ) : signup ? (
          <>
            Already have an account?{" "}
            <Link className={textLinkClassName} href="/login">
              Log in
            </Link>
          </>
        ) : (
          <Link className={textLinkClassName} href="/login">
            Back to log in
          </Link>
        )}
      </p>
    </form>
  );
}
