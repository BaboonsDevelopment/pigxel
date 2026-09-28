"use client";

import { useActionState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { signOut } from "@/app/login/actions";
import type { AuthState } from "@/lib/auth/types";

export function SignOutButton() {
  const [state, action, pending] = useActionState(signOut, {} as AuthState);
  return (
    <form action={action}>
      <Button disabled={pending}>
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
