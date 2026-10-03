"use client";

import { BLEND_MODES, MAX_OPACITY } from "@/lib/layers/constants";
import type { BlendMode, Layer } from "@/lib/layers/types";

export function LayerOptions({
  layer,
  onChange,
}: {
  layer: Layer;
  onChange: (patch: { opacity?: number; blend?: BlendMode }) => void;
}) {
  if (layer.kind === "background") return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">Opacity</span>
        <input
          type="range"
          min={0}
          max={MAX_OPACITY}
          value={layer.opacity}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
          className="w-28 accent-primary"
        />
        <span className="w-8 text-right tabular-nums">{layer.opacity}</span>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">Blend</span>
        <select
          value={layer.blend}
          onChange={(e) => onChange({ blend: e.target.value as BlendMode })}
          className="h-7 rounded-md border bg-background px-1"
        >
          {BLEND_MODES.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
