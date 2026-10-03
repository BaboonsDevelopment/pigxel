"use client";

import { useState } from "react";
import { MAX_FRAME_DURATION, MIN_FRAME_DURATION } from "@/lib/sprite/constants";

export function FrameDuration({
  duration,
  onChange,
}: {
  duration: number;
  onChange: (ms: number) => void;
}) {
  const [draft, setDraft] = useState(String(duration));

  const apply = () => {
    const ms = Number(draft);
    if (draft.trim() && ms !== duration) onChange(ms);
    else setDraft(String(duration));
  };

  return (
    <label
      data-guide="frame-duration"
      className="flex items-center gap-1 text-sm"
    >
      <span className="text-muted-foreground">Duration</span>
      <input
        type="number"
        min={MIN_FRAME_DURATION}
        max={MAX_FRAME_DURATION}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setDraft(String(duration));
        }}
        className="h-7 w-16 rounded-md border bg-background px-1 text-right tabular-nums"
      />
      <span className="text-muted-foreground">ms</span>
    </label>
  );
}
