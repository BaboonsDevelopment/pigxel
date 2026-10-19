"use client";

import { useState, useTransition } from "react";
import { FEEDBACK_STATUSES, type FeedbackStatus } from "../feedback";
import { updateFeedbackStatus } from "../actions";
import { FormMessage } from "@pigxel/ui/components/field";

export function StatusControl({
  id,
  status,
}: {
  id: number;
  status: FeedbackStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-3">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Team status
        <select
          aria-label={`Status for feedback #${id}`}
          value={status}
          disabled={pending}
          className="h-8 rounded-lg border bg-background px-2 text-sm text-foreground"
          onChange={(event) => {
            const value = event.target.value;
            startTransition(async () => {
              setError(null);
              const result = await updateFeedbackStatus(id, value);
              if (result?.error) setError(result.error);
            });
          }}
        >
          {Object.entries(FEEDBACK_STATUSES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <FormMessage tone="error" className="mt-2">
          {error}
        </FormMessage>
      )}
    </div>
  );
}
