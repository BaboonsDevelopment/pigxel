"use client";

import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { cn } from "@pigxel/ui/lib/utils";
import type { ColorSlot } from "../../pixel-canvas/pen";
import type { PenSettings } from "../../pixel-canvas/pen";
import type { ColorMode } from "@/lib/palette/color-mode";
import { ColorPicker } from "./color-picker";
import { swatchProps, swatchStyle, withColor } from "./helpers";

type PaletteChange = {
  edited?: { from: string; to: string };
  loaded?: boolean;
};
export function PalettePanel({
  pen,
  onChange,
  palette,
  onPaletteChange,
  colorMode,
}: {
  pen: PenSettings;
  onChange: (pen: PenSettings) => void;
  palette: string[];
  onPaletteChange: (palette: string[], change?: PaletteChange) => void;
  colorMode: ColorMode;
}) {
  const [dragged, setDragged] = useState<number | null>(null);
  const [editing, setEditing] = useState<{
    from: string;
    to: string;
    at: { left: number; top: number };
  } | null>(null);
  const editSwatch = (color: string, button: HTMLElement) => {
    const box = button.getBoundingClientRect();
    setEditing({
      from: color,
      to: color,
      at: {
        left: Math.min(box.right + 8, window.innerWidth - 248),
        top: Math.max(8, Math.min(box.top, window.innerHeight - 440)),
      },
    });
  };
  const finishEdit = () => {
    if (!editing) return;
    const { from, to } = editing;
    setEditing(null);
    if (from === to) return;
    const next = palette.includes(to)
      ? palette.filter((c) => c !== from)
      : palette.map((c) => (c === from ? to : c));
    onPaletteChange(next, { edited: { from, to } });
  };

  const pick = (color: string, slot: ColorSlot) =>
    onChange(withColor(pen, color, slot));
  const moveSwatch = (from: number, to: number) => {
    if (from === to) return;
    const next = [...palette];
    const [color] = next.splice(from, 1);
    next.splice(to, 0, color!);
    onPaletteChange(next);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col p-2">
      <div className="mb-1 flex items-center justify-between">
        <p
          className="text-[10px] tracking-wide text-muted-foreground uppercase"
          title={
            colorMode === "indexed"
              ? "Indexed: the tile uses only these colours. Double-click one to change it everywhere."
              : "Double-click a colour to change it"
          }
        >
          {palette.length} {palette.length === 1 ? "colour" : "colours"}
          {colorMode !== "rgb" && (
            <span className="ml-1 rounded bg-muted px-1 text-foreground normal-case">
              {colorMode === "indexed" ? "Indexed" : "Grey"}
            </span>
          )}
        </p>
      </div>
      <ul className="grid min-h-0 grid-cols-[repeat(auto-fill,minmax(1.25rem,1fr))] content-start gap-0.5 overflow-y-auto p-1">
        {palette.map((color, i) => (
          <li
            key={color}
            draggable
            onDragStart={() => setDragged(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragged !== null) moveSwatch(dragged, i);
              setDragged(null);
            }}
            onDragEnd={() => setDragged(null)}
          >
            <button
              type="button"
              aria-label={color}
              {...swatchProps(color, pick)}
              title={`${color} · click: primary, right-click: secondary, double-click: change`}
              onDoubleClick={(e) => editSwatch(color, e.currentTarget)}
              className={cn(
                "relative block aspect-square w-full rounded-[2px] ring-1 ring-black/10",
                color === pen.color &&
                  "z-10 ring-2 ring-foreground ring-offset-1",
                dragged === i && "opacity-40",
              )}
              style={swatchStyle(color)}
            >
              {color === pen.secondary && (
                <span
                  aria-hidden="true"
                  className="absolute right-0.5 bottom-0.5 size-1.5 rounded-full bg-white ring-1 ring-black/40"
                />
              )}
            </button>
          </li>
        ))}
      </ul>
      {editing && (
        <div
          role="dialog"
          aria-label={`Change ${editing.from}`}
          style={editing.at}
          className="fixed z-50 flex w-60 flex-col gap-2 rounded-lg border bg-background p-3 shadow-lg"
        >
          <ColorPicker
            color={editing.to}
            onChange={(to) => setEditing({ ...editing, to })}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={finishEdit}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
