"use client";

import { useActionState, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { deleteAccount, type DeleteState } from "./delete-account";
import { DELETE_PHRASE } from "./delete-phrase";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(
    deleteAccount,
    {} as DeleteState,
  );
  const [typed, setTyped] = useState("");
  const ready = typed.trim().toLowerCase() === DELETE_PHRASE;
  return (
    <form action={action} className="max-w-md space-y-4">
      <Field
        label={`Type “${DELETE_PHRASE}” to confirm`}
        htmlFor="delete-confirm"
      >
        <Input
          id="delete-confirm"
          name="confirm"
          autoComplete="off"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={pending}
        />
      </Field>
      {state.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <Button variant="destructive" disabled={!ready || pending}>
        {pending ? "Deleting…" : "Delete my account"}
      </Button>
    </form>
  );
}
