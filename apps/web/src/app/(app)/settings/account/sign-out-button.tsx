"use client";

import { useActionState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { signOut } from "@/app/login/actions";
import type { AuthState } from "@/lib/auth/types";

export function SignOutButton() {
  const [state, action, pending] = useActionState(signOut, {} as AuthState);
  return (
    <form action={action}>
      <Button variant="secondary" disabled={pending}>
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {state.error && (
        <FormMessage tone="error" className="mt-3">
          {state.error}
        </FormMessage>
      )}
    </form>
  );
}
