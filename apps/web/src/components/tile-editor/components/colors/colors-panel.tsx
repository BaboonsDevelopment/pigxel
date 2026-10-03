"use client";

import { useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { ColorSlot } from "@/components/pixel-canvas/pixel-canvas";
import type { PenSettings } from "@/components/pixel-canvas/pen";
import { ColorPicker } from "./color-picker";
import { swatchProps, withColor } from "./helpers";

/**
 * The colours to paint with: the primary and secondary colour (left and
 * right button) with a swap, a picker always open for the one picked
 * (click a colour square to edit it), and the colours used lately.
 */
export function ColorsPanel({
  pen,
  onChange,
}: {
  pen: PenSettings;
  onChange: (pen: PenSettings) => void;
}) {
  const [editing, setEditing] = useState<ColorSlot>("primary");
  const pick = (color: string, slot: ColorSlot) =>
    onChange(withColor(pen, color, slot));
  const edited = editing === "primary" ? pen.color : pen.secondary;

  return (
    <div className="flex flex-col gap-3 p-2">
      <div className="flex">
        <div className="relative h-15 w-16 shrink-0">
          <ColorWell
            label="Secondary colour (right button)"
            color={pen.secondary}
            active={editing === "secondary"}
            onClick={() => setEditing("secondary")}
            className="right-0 bottom-0"
          />
          <ColorWell
            label="Primary colour (left button)"
            color={pen.color}
            active={editing === "primary"}
            onClick={() => setEditing("primary")}
            className="top-0 left-0 z-10"
          />
          <button
            type="button"
            title="Swap colours (X)"
            aria-label="Swap primary and secondary colours"
            onClick={() =>
              onChange({ ...pen, color: pen.secondary, secondary: pen.color })
            }
            className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ⇄
          </button>
        </div>
      </div>

      <ColorPicker color={edited} onChange={(color) => pick(color, editing)} />

      {pen.recent.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] tracking-wide text-muted-foreground uppercase">
            Recent
          </p>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(1rem,1fr))] gap-0.5">
            {pen.recent.map((color) => (
              <li key={color}>
                <button
                  type="button"
                  aria-label={color}
                  {...swatchProps(color, pick)}
                  className="block aspect-square w-full rounded-[2px] ring-1 ring-black/10"
                  style={{ backgroundColor: color }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ColorWell({
  label,
  color,
  active,
  onClick,
  className,
}: {
  label: string;
  color: string;
  /** The picker edits this colour. */
  active: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      aria-label={`${label}: ${color}`}
      aria-pressed={active}
      title={`${label}: ${color} · click to edit it`}
      onClick={onClick}
      className={cn(
        "absolute size-10 rounded-md border-2 border-background shadow ring-1 ring-black/15",
        active && "ring-2 ring-foreground",
        className,
      )}
      style={{ backgroundColor: color }}
    />
  );
}
