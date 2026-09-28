"use client";

type Props = {
  draft: string;
  onDraft: (text: string) => void;
  /** When on, a new picture goes into an area the user selects after sending. */
  selectArea: boolean;
  onSelectArea: (on: boolean) => void;
  pending: boolean;
  onSend: (text: string) => void;
};

export function ChatComposer({
  draft,
  onDraft,
  selectArea,
  onSelectArea,
  pending,
  onSend,
}: Props) {
  const canSend = !pending && draft.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    onSend(draft.trim());
    onDraft("");
  };

  return (
    <form
      className="flex shrink-0 flex-col gap-2 border-t p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none hover:text-foreground">
        <input
          type="checkbox"
          checked={selectArea}
          onChange={(e) => onSelectArea(e.target.checked)}
          className="accent-primary"
        />
        Select area
      </label>
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          aria-label="Message"
          placeholder="Ask for a change…"
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
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
      </div>
    </form>
  );
}
