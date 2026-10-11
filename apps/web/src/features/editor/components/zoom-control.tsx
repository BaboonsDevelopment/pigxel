"use client";

import { useRef, useState } from "react";
import { MAX_SCALE, MIN_SCALE } from "../pixel-canvas/constants";

// A scale of four is the 100% reference size in the zoom control.
const PERCENT_PER_SCALE = 25;

export function ZoomControl({
  scale,
  onChange,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
}: {
  scale: number;
  onChange: (scale: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const canceled = useRef(false);
  const percent = Math.round(scale * PERCENT_PER_SCALE);
  const commit = () => {
    const value = Number(draft);
    if (
      !canceled.current &&
      draft?.trim() &&
      Number.isInteger(value) &&
      value > 0
    )
      onChange(value / PERCENT_PER_SCALE);
    canceled.current = false;
    setDraft(null);
  };
  return (
    <div className="flex items-center gap-0.5 rounded-md border bg-background/95 p-0.5 text-xs shadow-sm">
      <button
        type="button"
        aria-label="Fit to window"
        title="Fit the whole tile to the canvas area"
        onClick={onFit}
        className="h-6 rounded px-1.5 hover:bg-muted"
      >
        Fit
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        onClick={onZoomOut}
        className="size-6 rounded hover:bg-muted"
      >
        −
      </button>
      <label className="flex items-center">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Zoom percentage"
          value={draft ?? String(percent)}
          title={`Zoom (${MIN_SCALE * PERCENT_PER_SCALE}%–${MAX_SCALE * PERCENT_PER_SCALE}%). Enter to apply, Escape to cancel.`}
          onFocus={(e) => {
            canceled.current = false;
            setDraft(String(percent));
            e.currentTarget.select();
          }}
          onChange={(e) => {
            if (/^\d*$/.test(e.target.value)) setDraft(e.target.value);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" || e.key === "Escape") {
              e.preventDefault();
              canceled.current = e.key === "Escape";
              e.currentTarget.blur();
            }
          }}
          className="h-6 w-16 rounded bg-transparent px-1 text-right tabular-nums focus:outline-2 focus:outline-primary"
        />
        <span aria-hidden="true" className="pr-1">
          %
        </span>
      </label>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={onZoomIn}
        className="size-6 rounded hover:bg-muted"
      >
        +
      </button>
      <button
        type="button"
        title="Reset zoom"
        aria-label="Reset zoom"
        onClick={onReset}
        className="h-6 rounded px-1.5 hover:bg-muted"
      >
        ↺
      </button>
    </div>
  );
}
