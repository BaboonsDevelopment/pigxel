"use client";

import { useActionState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { saveTutorialVideo } from "../actions";
import type { PerkState } from "@/features/membership/validation";

export function TutorialVideoForm({
  slug,
  youtubeId,
}: {
  slug: string;
  youtubeId?: string;
}) {
  const [state, action, pending] = useActionState(
    saveTutorialVideo.bind(null, slug),
    {} as PerkState,
  );
  return (
    <form
      action={action}
      className="mt-5 space-y-3 rounded-xl border bg-background p-4"
    >
      <Field
        label="Lesson video (admin)"
        htmlFor="lesson-video"
        hint="Paste the lesson’s YouTube URL or video ID. Leave empty to remove it."
      >
        <Input
          id="lesson-video"
          name="video"
          defaultValue={
            youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : ""
          }
          placeholder="https://www.youtube.com/watch?v=…"
          maxLength={500}
        />
      </Field>
      {state.error && <FormMessage tone="error">{state.error}</FormMessage>}
      {state.message && (
        <FormMessage tone="success" role="status">
          {state.message}
        </FormMessage>
      )}
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save video"}
      </Button>
    </form>
  );
}
