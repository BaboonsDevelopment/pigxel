"use client";

import { useState } from "react";

export function FrameJump({
  index,
  count,
  onJump,
}: {
  index: number;
  count: number;
  onJump: (index: number) => void;
}) {
  const [draft, setDraft] = useState(String(index + 1));

  const jump = () => {
    const to = Math.round(Number(draft));
    if (draft.trim() && to >= 1 && to <= count && to !== index + 1)
      onJump(to - 1);
    else setDraft(String(index + 1));
  };

  return (
    <label className="flex items-center gap-1 text-sm">
      <span className="text-muted-foreground">Frame</span>
      <input
        type="number"
        aria-label="Go to frame"
        title="Type a frame number and press Enter"
        min={1}
        max={count}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={jump}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setDraft(String(index + 1));
        }}
        className="h-7 w-12 rounded-md border bg-background px-1 text-right tabular-nums"
      />
      <span className="text-muted-foreground tabular-nums">/ {count}</span>
    </label>
  );
}
