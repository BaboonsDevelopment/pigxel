"use client";

import { Button } from "@pigxel/ui/components/button";
import { Input } from "@pigxel/ui/components/input";
import type { FreeTransform } from "@/components/pixel-canvas/free-transform";
import type { SelectionApi } from "@/components/pixel-canvas/use-selection";

const FIELDS: {
  key: "width" | "height" | "angle" | "skew";
  label: string;
  unit: string;
  title: string;
}[] = [
  { key: "width", label: "W", unit: "%", title: "Width, % of the lifted size" },
  {
    key: "height",
    label: "H",
    unit: "%",
    title: "Height, % of the lifted size",
  },
  {
    key: "angle",
    label: "Angle",
    unit: "°",
    title: "Turn clockwise, in degrees",
  },
  {
    key: "skew",
    label: "Skew",
    unit: "°",
    title: "Slant sideways, in degrees",
  },
];

/**
 * Exact numbers for scaling, turning and slanting the selection with the
 * Move tool (the handles on the canvas do the same by hand), how pixels are
 * picked, and Apply, which puts the result down.
 */
export function TransformOptions({ selection }: { selection: SelectionApi }) {
  const current = selection.freeTransform?.t;
  const values = {
    width: Math.round((current?.scaleX ?? 1) * 1000) / 10,
    height: Math.round((current?.scaleY ?? 1) * 1000) / 10,
    angle: current?.angle ?? 0,
    skew: current?.skew ?? 0,
  };

  const change = (patch: Partial<FreeTransform>) => {
    const from = selection.beginTransform();
    if (from) selection.setTransform({ ...from.t, ...patch });
  };
  const set = (key: (typeof FIELDS)[number]["key"], n: number) =>
    change(
      key === "width"
        ? { scaleX: Math.max(1, n) / 100 }
        : key === "height"
          ? { scaleY: Math.max(1, n) / 100 }
          : key === "angle"
            ? { angle: Math.max(-360, Math.min(360, n)) }
            : { skew: Math.max(-80, Math.min(80, n)) },
    );

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Transform"
    >
      {FIELDS.map(({ key, label, unit, title }) => (
        <label key={key} className="flex items-center gap-1" title={title}>
          <span className="text-muted-foreground">{label}</span>
          <Input
            type="number"
            inputSize="sm"
            step={key === "width" || key === "height" ? 5 : 1}
            value={values[key]}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) set(key, n);
            }}
            className="w-16 px-1 text-center tabular-nums"
          />
          <span className="text-muted-foreground">{unit}</span>
        </label>
      ))}
      <label
        className="flex items-center gap-1"
        title="RotSprite keeps pixel art clean when turned; Nearest takes the nearest pixel"
      >
        <select
          value={current?.method ?? "rotsprite"}
          onChange={(e) =>
            change({ method: e.target.value as FreeTransform["method"] })
          }
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="rotsprite">RotSprite</option>
          <option value="nearest">Nearest</option>
        </select>
      </label>
      {selection.freeTransform && (
        <Button
          type="button"
          size="sm"
          title="Put the result down (Enter)"
          onClick={selection.drop}
        >
          Apply
        </Button>
      )}
    </div>
  );
}
