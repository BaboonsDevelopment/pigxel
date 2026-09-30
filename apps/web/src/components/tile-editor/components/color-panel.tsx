"use client";

import { useRef, useState, type MouseEvent } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { ColorSlot } from "@/components/pixel-canvas/pixel-canvas";
import type { PenSettings } from "@/components/pixel-canvas/pen";
import { downloadBlob } from "@/lib/download";
import { decodeImage } from "@/lib/image/decode";
import {
  PALETTE_FILE_TYPES,
  parsePaletteFile,
  toGpl,
} from "@/lib/palette/files";
import { MAX_PALETTE, PALETTE_PRESETS, colorsOf } from "@/lib/palette/presets";
import { safeFileBase } from "@/lib/pigxel-file/format";

/**
 * The colours, below the tools: the primary and secondary colour (left and
 * right button), the ones used lately, and the tile's palette. A swatch
 * takes the primary colour on a click and the secondary on a right-click;
 * palette swatches can be dragged into another order.
 */
export function ColorPanel({
  pen,
  onChange,
  palette,
  onPaletteChange,
  frameColors,
  fileName,
}: {
  pen: PenSettings;
  onChange: (pen: PenSettings) => void;
  palette: string[];
  onPaletteChange: (palette: string[]) => void;
  /** The colours the frame on screen uses, for a palette made from it. */
  frameColors: () => string[];
  /** The tile's name, for the palette file saved from it. */
  fileName: string;
}) {
  const [dragged, setDragged] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  /** Loads a palette file (.gpl, .hex, .txt) or the colours of a picture. */
  const importFile = async (chosen: File | undefined) => {
    if (!chosen) return;
    setProblem(null);
    try {
      const colors = chosen.type.startsWith("image/")
        ? colorsOf((await decodeImage(chosen, 256)).rgba)
        : parsePaletteFile(await chosen.text());
      if (colors?.length) onPaletteChange(colors);
      else setProblem("No colours found in that file.");
    } catch {
      setProblem("Couldn’t read that file.");
    }
  };
  const pick = (color: string, slot: ColorSlot) =>
    onChange(
      slot === "primary" ? { ...pen, color } : { ...pen, secondary: color },
    );
  const swatchProps = (color: string) => ({
    title: `${color} · click: primary, right-click: secondary`,
    onClick: () => pick(color, "primary"),
    onContextMenu: (e: MouseEvent) => {
      e.preventDefault();
      pick(color, "secondary");
    },
  });
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
    if (preset) onPaletteChange([...preset.colors]);
  };

  const moveSwatch = (from: number, to: number) => {
    if (from === to) return;
    const next = [...palette];
    const [color] = next.splice(from, 1);
    next.splice(to, 0, color!);
    onPaletteChange(next);
  };

  return (
    <section
      aria-label="Colors"
      className="flex min-h-0 flex-1 flex-col gap-3 border-t p-2"
    >
      <div className="relative mx-auto h-15 w-16">
        <ColorWell
          label="Secondary colour (right button)"
          color={pen.secondary}
          onChange={(color) => pick(color, "secondary")}
          className="right-0 bottom-0"
        />
        <ColorWell
          label="Primary colour (left button)"
          color={pen.color}
          onChange={(color) => pick(color, "primary")}
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

      {pen.recent.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] tracking-wide text-muted-foreground uppercase">
            Recent
          </p>
          <ul className="grid grid-cols-6 gap-0.5">
            {pen.recent.map((color) => (
              <li key={color}>
                <button
                  type="button"
                  aria-label={color}
                  {...swatchProps(color)}
                  className="block aspect-square w-full rounded-[2px] ring-1 ring-black/10"
                  style={{ backgroundColor: color }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Palette
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
        <ul className="grid min-h-0 grid-cols-4 content-start gap-0.5 overflow-y-auto">
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
                {...swatchProps(color)}
                className={cn(
                  "relative block aspect-square w-full rounded-[2px] ring-1 ring-black/10",
                  color === pen.color &&
                    "z-10 ring-2 ring-foreground ring-offset-1",
                  dragged === i && "opacity-40",
                )}
                style={{ backgroundColor: color }}
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
      </div>
    </section>
  );
}

function ColorWell({
  label,
  color,
  onChange,
  className,
}: {
  label: string;
  color: string;
  onChange: (color: string) => void;
  className: string;
}) {
  return (
    <label
      title={`${label}: ${color}`}
      className={cn(
        "absolute size-10 cursor-pointer rounded-md border-2 border-background shadow ring-1 ring-black/15",
        className,
      )}
      style={{ backgroundColor: color }}
    >
      <span className="sr-only">{label}</span>
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </label>
  );
}
