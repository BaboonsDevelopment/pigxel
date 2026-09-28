"use client";

import { useState } from "react";

type Props = {
  pending: boolean;
  onSend: (text: string) => void;
};

export function ChatComposer({ pending, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const canSend = !pending && draft.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    onSend(draft.trim());
    setDraft("");
  };

  return (
    <form
      className="flex shrink-0 items-end gap-2 border-t p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        rows={2}
        aria-label="Message"
        placeholder="Ask for a change…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="min-h-11 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="submit"
        disabled={!canSend}
        className="h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
