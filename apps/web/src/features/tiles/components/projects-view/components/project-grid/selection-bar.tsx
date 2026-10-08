"use client";

import { cn } from "@pigxel/ui/lib/utils";

const ACTION =
  "h-8 cursor-pointer rounded-lg px-3 text-xs transition-colors hover:bg-white/15 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent";

export function SelectionBar({
  count,
  busy,
  canMove,
  canPublish,
  onMove,
  onPublish,
  onDelete,
  onSelectAll,
  onCancel,
}: {
  count: number;
  busy: boolean;
  canMove: boolean;
  canPublish: boolean;
  onMove: () => void;
  onPublish: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Selected projects"
      className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-foreground p-1.5 pl-4 text-background shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <span className="mr-2 text-xs tabular-nums" aria-live="polite">
        {count} selected
      </span>
      <button type="button" onClick={onSelectAll} className={ACTION}>
        Select all
      </button>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/20" />
      <button
        type="button"
        disabled={busy || !canMove}
        onClick={onMove}
        className={ACTION}
      >
        Move to folder…
      </button>
      <button
        type="button"
        disabled={busy || !canPublish}
        onClick={onPublish}
        className={ACTION}
      >
        Publish
      </button>
      <button
        type="button"
        disabled={busy || count === 0}
        onClick={onDelete}
        className={cn(ACTION, "text-[#ff9db8]")}
      >
        Delete
      </button>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/20" />
      <button
        type="button"
        aria-label="Stop selecting"
        onClick={onCancel}
        className={cn(ACTION, "px-2")}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="size-3.5"
        >
          <path d="m4 4 8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}
