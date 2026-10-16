"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { Notice } from "@pigxel/ui/components/notice";
import { textLinkClassName } from "@pigxel/ui/components/typography";
import { authenticate } from "../actions";
import { PasswordInput } from "./password-input";
import { HOME_PATH, loginUrl } from "@/lib/auth/routes";
import type { AuthMode, AuthState } from "@/lib/auth/types";
import {
  consented,
  type Consent,
} from "@/features/legal/components/consent-checks";

const labels: Record<AuthMode, string> = {
  login: "Log in",
  signup: "Create account",
  forgot: "Send reset link",
};

export function AuthForm({
  mode,
  configured,
  next = HOME_PATH,
  consent,
}: {
  mode: AuthMode;
  configured: boolean;
  next?: string;
  /** For sign-up: the boxes ticked above the form. */
  consent?: Consent;
}) {
  const [state, action, pending] = useActionState(
    authenticate.bind(null, mode),
    {} as AuthState,
  );
  const signup = mode === "signup";
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      {consent?.age && <input type="hidden" name="age" value="on" />}
      {consent?.terms && <input type="hidden" name="terms" value="on" />}
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
          <PasswordInput
            id="password"
            name="password"
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
        disabled={
          pending ||
          !configured ||
          (consent !== undefined && !consented(consent))
        }
      >
        {pending ? "Please wait…" : labels[mode]}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            New to Pigxel?{" "}
            <Link className={textLinkClassName} href={loginUrl("signup", next)}>
              Create an account
            </Link>
          </>
        ) : signup ? (
          <>
            Already have an account?{" "}
            <Link className={textLinkClassName} href={loginUrl("login", next)}>
              Log in
            </Link>
          </>
        ) : (
          <Link className={textLinkClassName} href={loginUrl("login", next)}>
            Back to log in
          </Link>
        )}
      </p>
    </form>
  );
}
