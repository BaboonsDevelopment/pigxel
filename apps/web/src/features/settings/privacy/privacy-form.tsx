"use client";

import { useActionState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { ChoiceCard, ChoiceText, Radio } from "@pigxel/ui/components/choice";
import { FormMessage } from "@pigxel/ui/components/field";
import type { Visibility } from "@/lib/profile/profile";
import { setProfileVisibility, type PrivacyState } from "./actions";

const OPTIONS: { value: Visibility; title: string; text: string }[] = [
  {
    value: "public",
    title: "Public",
    text: "Anyone signed in to Pigxel can see your profile and the arts you publish.",
  },
  {
    value: "private",
    title: "Private",
    text: "Only you can see your profile and your arts, even the ones you published.",
  },
];

export function PrivacyForm({ visibility }: { visibility: Visibility }) {
  const [state, action, pending] = useActionState(
    setProfileVisibility,
    {} as PrivacyState,
  );
  return (
    <form action={action} className="mt-4 space-y-4">
      <fieldset className="space-y-2">
        <legend className="sr-only">Who can see your profile</legend>
        {OPTIONS.map((option) => (
          <ChoiceCard key={option.value}>
            <Radio
              name="visibility"
              value={option.value}
              defaultChecked={visibility === option.value}
            />
            <ChoiceText title={option.title}>{option.text}</ChoiceText>
          </ChoiceCard>
        ))}
      </fieldset>
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
