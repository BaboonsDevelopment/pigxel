"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage, Label } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import type { AuthState } from "@/lib/auth/types";
import { changeEmail, unlinkProvider } from "./actions";

export function EmailForm({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState(changeEmail, {} as AuthState);
  return (
    <form action={action} className="mt-4 space-y-3">
      <Label htmlFor="email" className="sr-only">
        New email
      </Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={current ?? "you@example.com"}
          defaultValue={state.email}
          className="flex-1"
        />
        <Button variant="secondary" className="h-10" disabled={pending}>
          {pending ? "Sending…" : "Change email"}
        </Button>
      </div>
      {state.error && <FormMessage tone="error">{state.error}</FormMessage>}
      {state.message && (
        <FormMessage role="status">{state.message}</FormMessage>
      )}
    </form>
  );
}

export function UnlinkButton({
  provider,
  label,
}: {
  provider: "google" | "apple";
  label: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="text-right">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await unlinkProvider(provider);
            if (result.error) setError(result.error);
          })
        }
      >
        {pending ? "Disconnecting…" : `Disconnect ${label}`}
      </Button>
      {error && (
        <FormMessage tone="error" className="mt-2 max-w-64">
          {error}
        </FormMessage>
      )}
    </div>
  );
}
