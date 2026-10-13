"use client";

import { useState } from "react";

const MAX_FPS = 100;

export function FramesPerSecond({
  durations,
  onChange,
}: {
  durations: number[];
  onChange: (ms: number) => void;
}) {
  const same = durations.every((ms) => ms === durations[0]);
  const shown = same && durations[0] ? fpsOf(durations[0]) : "";
  const [draft, setDraft] = useState(shown);

  const apply = () => {
    const fps = Number(draft);
    if (!draft.trim() || !(fps > 0)) return setDraft(shown);
    const ms = Math.round(1000 / Math.min(MAX_FPS, fps));
    setDraft(fpsOf(ms));
    if (!same || ms !== durations[0]) onChange(ms);
  };

  return (
    <label
      className="flex items-center gap-1 text-sm"
      title="Frames per second for the whole animation: every frame gets the same duration"
    >
      <input
        type="number"
        min={1}
        max={MAX_FPS}
        step="any"
        value={draft}
        placeholder="mixed"
        aria-label="Frames per second for the whole animation"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setDraft(shown);
        }}
        className="h-7 w-14 rounded-md border bg-background px-1 text-right tabular-nums"
      />
      <span className="text-muted-foreground">fps</span>
    </label>
  );
}

const fpsOf = (ms: number) => String(Math.round((1000 / ms) * 10) / 10);
