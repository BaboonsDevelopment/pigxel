"use client";

import { useActionState, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { acceptLegal, type AcceptState } from "../actions";
import { ConsentChecks, consented, type Consent } from "./consent-checks";

export function AcceptForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(
    acceptLegal.bind(null, next),
    {} as AcceptState,
  );
  const [consent, setConsent] = useState<Consent>({ age: false, terms: false });
  return (
    <form action={action} className="space-y-5">
      <ConsentChecks value={consent} onChange={setConsent} disabled={pending} />
      {state.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <Button
        size="lg"
        className="w-full"
        disabled={pending || !consented(consent)}
      >
        {pending ? "Please wait…" : "Continue to Pigxel"}
      </Button>
    </form>
  );
}
