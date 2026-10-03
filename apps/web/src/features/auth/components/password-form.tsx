"use client";

import { useActionState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { updatePassword } from "../actions";
import type { AuthState } from "@/lib/auth/types";

export function PasswordForm() {
  const [state, action, pending] = useActionState(
    updatePassword,
    {} as AuthState,
  );
  return (
    <form action={action} className="space-y-5">
      <Field
        label="New password"
        htmlFor="password"
        hint="At least 8 characters."
      >
        <Input
          id="password"
          name="password"
          type="password"
          inputSize="lg"
          className="h-12 rounded-xl"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={pending}
          aria-describedby="password-hint"
        />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword">
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          inputSize="lg"
          className="h-12 rounded-xl"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={pending}
        />
      </Field>
      {state.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <Button size="lg" className="h-12 w-full rounded-full" disabled={pending}>
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
