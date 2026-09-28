export function ChatComposer() {
  return (
    <form className="flex shrink-0 items-end gap-2 border-t p-3">
      <textarea
        rows={2}
        aria-label="Message"
        placeholder="Ask for a change…"
        className="min-h-11 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="button"
        className="h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Send
      </button>
    </form>
  );
}
