import { ICONS } from "../icons";

export function ChatHeader({ onCollapse }: { onCollapse: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
      <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        Assistant
      </h2>
      <button
        type="button"
        onClick={onCollapse}
        title="Hide the assistant"
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {ICONS.collapse}
      </button>
    </header>
  );
}
