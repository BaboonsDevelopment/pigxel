"use client";

import { useActionState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { CheckboxField } from "@pigxel/ui/components/choice";
import { FormMessage } from "@pigxel/ui/components/field";
import { setShowActivity, type PrivacyState } from "./actions";

export function ActivityForm({ showActivity }: { showActivity: boolean }) {
  const [state, action, pending] = useActionState(
    setShowActivity,
    {} as PrivacyState,
  );
  return (
    <form action={action} className="mt-4 space-y-4">
      <CheckboxField
        name="showActivity"
        defaultChecked={showActivity}
        label="Show my activity heatmap on my profile"
        className="rounded-xl border bg-background p-4"
      />
      <div className="flex items-center gap-4">
        <Button disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        {state.error ? (
          <FormMessage tone="error">{state.error}</FormMessage>
        ) : (
          <FormMessage role="status" tone="success">
            {state.message}
          </FormMessage>
        )}
      </div>
    </form>
  );
}
