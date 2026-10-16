"use client";

import { cn } from "@pigxel/ui/lib/utils";
import type { ColorSlot } from "../../pixel-canvas/pen";
import type { PenSettings } from "../../pixel-canvas/pen";
import { ColorPicker } from "./color-picker";
import { swatchProps, swatchStyle, withColor } from "./helpers";

type ColorsProps = {
  pen: PenSettings;
  onChange: (pen: PenSettings) => void;
  /** Which colour the picker edits. */
  editing: ColorSlot;
  onEditing: (slot: ColorSlot) => void;
  /** Adds a colour to the palette; left out when it can't take more. */
  onAddToPalette?: (color: string) => void;
};

/** The picker and recent colours, for the colour being edited. */
export function ColorsPanel({
  pen,
  onChange,
  editing,
  onAddToPalette,
}: ColorsProps) {
  const pick = (color: string, slot: ColorSlot) =>
    onChange(withColor(pen, color, slot));
  const edited = editing === "primary" ? pen.color : pen.secondary;

  return (
    <div className="flex flex-col gap-3">
      <ColorPicker
        color={edited}
        onChange={(color) => pick(color, editing)}
        onAdd={onAddToPalette && (() => onAddToPalette(edited))}
      />

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
                  style={swatchStyle(color)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Primary and secondary colours, and swapping them; click one to edit it. */
export function ColorWells({ pen, onChange, editing, onEditing }: ColorsProps) {
  return (
    <div className="relative h-12 w-12 shrink-0">
      <ColorWell
        label="Secondary colour (right button)"
        color={pen.secondary}
        active={editing === "secondary"}
        onClick={() => onEditing("secondary")}
        className="right-0 bottom-0"
      />
      <ColorWell
        label="Primary colour (left button)"
        color={pen.color}
        active={editing === "primary"}
        onClick={() => onEditing("primary")}
        className="top-0 left-0 z-10"
      />
      <button
        type="button"
        title="Swap colours (X)"
        aria-label="Swap primary and secondary colours"
        onClick={() =>
          onChange({ ...pen, color: pen.secondary, secondary: pen.color })
        }
        className="absolute -right-1 -bottom-6 flex size-6 items-center justify-center rounded text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        ⇄
      </button>
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
        "absolute size-8 rounded-md border-2 border-background shadow ring-1 ring-black/15",
        active && "ring-2 ring-foreground",
        className,
      )}
      style={swatchStyle(color)}
    />
  );
}
