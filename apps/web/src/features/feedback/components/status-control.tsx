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
  const [savedStatus, setSavedStatus] = useState<FeedbackStatus | null>(null);
  return (
    <div className="mt-3">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Team status
        <select
          aria-label={`Status for feedback #${id}`}
          value={savedStatus ?? status}
          disabled={pending}
          className="h-8 rounded-lg border bg-background px-2 text-sm text-foreground"
          onChange={(event) => {
            const value = event.target.value;
            startTransition(async () => {
              setError(null);
              try {
                const result = await updateFeedbackStatus(id, value);
                if (result?.error) setError(result.error);
                else setSavedStatus(value as FeedbackStatus);
              } catch {
                setError("Couldn’t update this status. Please try again.");
              }
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
      <span className="sr-only" role="status">
        {pending
          ? "Saving status…"
          : savedStatus && !error
            ? "Status saved."
            : ""}
      </span>
      {error && (
        <FormMessage tone="error" className="mt-2">
          {error}
        </FormMessage>
      )}
    </div>
  );
}
