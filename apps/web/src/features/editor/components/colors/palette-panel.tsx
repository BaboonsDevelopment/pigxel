"use client";

import { useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { cn } from "@pigxel/ui/lib/utils";
import type { ColorSlot } from "../../pixel-canvas/pen";
import type { PenSettings } from "../../pixel-canvas/pen";
import { downloadBlob } from "@/lib/utils/download";
import type { ColorMode } from "@/lib/palette/color-mode";
import { decodeImage } from "@/lib/image/decode";
import {
  PALETTE_FILE_TYPES,
  parsePaletteFile,
  toGpl,
} from "@/lib/palette/files";
import { MAX_PALETTE, PALETTE_PRESETS, colorsOf } from "@/lib/palette/presets";
import { safeFileBase } from "@/lib/pigxel-file/format";

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
  frameColors,
  fileName,
}: {
  pen: PenSettings;
  onChange: (pen: PenSettings) => void;
  palette: string[];
  onPaletteChange: (palette: string[], change?: PaletteChange) => void;
  colorMode: ColorMode;
  frameColors: () => string[];
  fileName: string;
}) {
  const [dragged, setDragged] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
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

  const importFile = async (chosen: File | undefined) => {
    if (!chosen) return;
    setProblem(null);
    try {
      const colors = chosen.type.startsWith("image/")
        ? colorsOf((await decodeImage(chosen, 256)).rgba)
        : parsePaletteFile(await chosen.text());
      if (colors?.length) onPaletteChange(colors, { loaded: true });
      else setProblem("No colours found in that file.");
    } catch {
      setProblem("Couldn’t read that file.");
    }
  };
  const pick = (color: string, slot: ColorSlot) =>
    onChange(withColor(pen, color, slot));
  const inPalette = palette.includes(pen.color);

  const loadPreset = (id: string) => {
    if (id === "import") return fileInput.current?.click();
    if (id === "export")
      return downloadBlob(
        new Blob([toGpl(palette, safeFileBase(fileName))], {
          type: "text/plain",
        }),
        `${safeFileBase(fileName)}.gpl`,
      );
    if (id === "frame") {
      const colors = frameColors();
      if (colors.length) onPaletteChange(colors);
      return;
    }
    const preset = PALETTE_PRESETS.find((p) => p.id === id);
    if (preset) onPaletteChange([...preset.colors], { loaded: true });
  };

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
        <div className="flex">
          <button
            type="button"
            title="Add the primary colour"
            aria-label="Add the primary colour to the palette"
            disabled={inPalette || palette.length >= MAX_PALETTE}
            onClick={() => onPaletteChange([...palette, pen.color])}
            className="flex size-5 items-center justify-center rounded text-sm hover:bg-muted disabled:opacity-30"
          >
            +
          </button>
          <button
            type="button"
            title="Remove the primary colour"
            aria-label="Remove the primary colour from the palette"
            disabled={!inPalette}
            onClick={() =>
              onPaletteChange(palette.filter((c) => c !== pen.color))
            }
            className="flex size-5 items-center justify-center rounded text-sm hover:bg-muted disabled:opacity-30"
          >
            −
          </button>
        </div>
      </div>
      <select
        aria-label="Load a palette"
        value=""
        onChange={(e) => loadPreset(e.target.value)}
        className="mb-2 h-7 w-full rounded-md border bg-background px-1 text-xs"
      >
        <option value="" disabled>
          Load…
        </option>
        {PALETTE_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
        <option value="frame">Colours in this frame</option>
        <option value="import">Import file…</option>
        <option value="export" disabled={!palette.length}>
          Save as .gpl
        </option>
      </select>
      <input
        ref={fileInput}
        type="file"
        accept={`${PALETTE_FILE_TYPES},image/*`}
        className="hidden"
        onChange={(e) => {
          void importFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {problem && (
        <p role="alert" className="mb-2 text-[11px] text-destructive">
          {problem}
        </p>
      )}
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
