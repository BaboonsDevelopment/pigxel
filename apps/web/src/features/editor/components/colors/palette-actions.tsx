"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PenSettings } from "../../pixel-canvas/pen";
import { downloadBlob } from "@/lib/utils/download";
import { decodeImage } from "@/lib/image/decode";
import {
  MAX_RAMP,
  MIN_RAMP,
  PALETTE_SORTS,
  rampBetween,
  sortedPalette,
  withColors,
} from "@/lib/palette/arrange";
import {
  PALETTE_FILE_TYPES,
  parsePaletteFile,
  toGpl,
} from "@/lib/palette/files";
import { MAX_PALETTE, PALETTE_PRESETS, colorsOf } from "@/lib/palette/presets";
import { safeFileBase } from "@/lib/pigxel-file/format";
import { HeaderButton } from "../dock/header-button";
import { swatchStyle } from "./helpers";
import { PALETTE_ICONS } from "./icons";

type PaletteChange = { loaded?: boolean };

const ITEM =
  "rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted disabled:opacity-40";

export function PaletteActions({
  pen,
  palette,
  onPaletteChange,
  frameColors,
  fileName,
}: {
  pen: PenSettings;
  palette: string[];
  onPaletteChange: (palette: string[], change?: PaletteChange) => void;
  frameColors: () => string[];
  fileName: string;
}) {
  const [rampSteps, setRampSteps] = useState(6);
  const [problem, setProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const ramp = rampBetween(pen.color, pen.secondary, rampSteps);
  const inPalette = palette.includes(pen.color);

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

  return (
    <span className="flex items-center">
      {problem && (
        <span
          role="alert"
          title={problem}
          onClick={() => setProblem(null)}
          className="mr-1 cursor-pointer text-xs text-destructive"
        >
          !
        </span>
      )}
      <HeaderButton
        label="Add the primary colour"
        icon={PALETTE_ICONS.add}
        disabled={inPalette || palette.length >= MAX_PALETTE}
        onClick={() => onPaletteChange([...palette, pen.color])}
      />
      <HeaderButton
        label="Remove the primary colour"
        icon={PALETTE_ICONS.remove}
        disabled={!inPalette}
        onClick={() => onPaletteChange(palette.filter((c) => c !== pen.color))}
      />
      <HeaderMenu icon={PALETTE_ICONS.ramp} label="Ramp of shades">
        {() => (
          <span className="flex flex-col gap-2 p-1">
            <span className="text-[11px] text-muted-foreground">
              Shades from the primary to the secondary colour
            </span>
            <span className="flex h-5 overflow-hidden rounded-[2px] ring-1 ring-black/10">
              {ramp.map((color, i) => (
                <span key={i} className="flex-1" style={swatchStyle(color)} />
              ))}
            </span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                aria-label="Shades in the ramp"
                min={MIN_RAMP}
                max={MAX_RAMP}
                value={rampSteps}
                onChange={(e) =>
                  setRampSteps(
                    Math.min(
                      MAX_RAMP,
                      Math.max(
                        MIN_RAMP,
                        Math.round(Number(e.target.value)) || MIN_RAMP,
                      ),
                    ),
                  )
                }
                className="h-6 w-12 rounded border bg-background px-1 text-center text-xs tabular-nums"
              />
              <button
                type="button"
                disabled={palette.length >= MAX_PALETTE}
                onClick={() =>
                  onPaletteChange(withColors(palette, ramp, MAX_PALETTE))
                }
                className="h-6 flex-1 rounded border px-2 text-xs hover:bg-muted disabled:opacity-30"
              >
                Add ramp
              </button>
            </span>
          </span>
        )}
      </HeaderMenu>
      <HeaderMenu
        icon={PALETTE_ICONS.arrange}
        label="Arrange the palette"
        disabled={palette.length < 2}
      >
        {(close) =>
          [
            ...PALETTE_SORTS,
            { value: "reverse" as const, label: "Reverse order" },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                close();
                onPaletteChange(
                  value === "reverse"
                    ? [...palette].reverse()
                    : sortedPalette(palette, value),
                );
              }}
              className={ITEM}
            >
              {label}
            </button>
          ))
        }
      </HeaderMenu>
      <HeaderMenu icon={PALETTE_ICONS.load} label="Load or save a palette">
        {(close) => (
          <>
            {PALETTE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  close();
                  onPaletteChange([...preset.colors], { loaded: true });
                }}
                className={ITEM}
              >
                {preset.name}
              </button>
            ))}
            <span className="my-1 border-t" />
            <button
              type="button"
              onClick={() => {
                close();
                const colors = frameColors();
                if (colors.length) onPaletteChange(colors);
              }}
              className={ITEM}
            >
              Colours in this frame
            </button>
            <button
              type="button"
              onClick={() => {
                close();
                fileInput.current?.click();
              }}
              className={ITEM}
            >
              Import file…
            </button>
            <button
              type="button"
              disabled={!palette.length}
              onClick={() => {
                close();
                downloadBlob(
                  new Blob([toGpl(palette, safeFileBase(fileName))], {
                    type: "text/plain",
                  }),
                  `${safeFileBase(fileName)}.gpl`,
                );
              }}
              className={ITEM}
            >
              Save as .gpl
            </button>
          </>
        )}
      </HeaderMenu>
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
    </span>
  );
}

function HeaderMenu({
  icon,
  label,
  disabled,
  children,
}: {
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!at) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !root.current?.contains(e.target as Node)
      )
        setAt(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [at]);

  return (
    <span ref={root} onPointerDown={(e) => e.stopPropagation()}>
      <HeaderButton
        label={label}
        icon={icon}
        aria-expanded={!!at}
        disabled={disabled}
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          setAt((open) =>
            open
              ? null
              : { top: box.bottom + 4, right: window.innerWidth - box.right },
          );
        }}
      />
      {at && (
        <span
          style={at}
          className="fixed z-50 flex max-h-[70dvh] w-48 flex-col overflow-y-auto rounded-lg border bg-background p-1 text-foreground normal-case shadow-lg"
        >
          {children(() => setAt(null))}
        </span>
      )}
    </span>
  );
}
