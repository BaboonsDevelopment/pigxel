"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { NumericInput } from "../numeric-input";
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
  paletteStrip,
  parsePaletteFile,
  toGpl,
  toHexFile,
} from "@/lib/palette/files";
import { MAX_PALETTE, PALETTE_PRESETS, colorsOf } from "@/lib/palette/presets";
import { safeFileBase } from "@/lib/pigxel-file/format";
import { encodePng } from "../../export/apng";
import { HeaderButton } from "./header-button";
import { swatchStyle } from "./helpers";
import { useSavedPalettes } from "./saved-palettes";

type PaletteChange = { loaded?: boolean };

const ITEM =
  "rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted disabled:opacity-40";
const HEADING =
  "px-2 pt-2 pb-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase";
const BUTTON =
  "flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-background text-sm transition-colors hover:bg-pink-base disabled:opacity-40";
const CUSTOM = "custom";
const DOTS = (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    className="size-4"
    fill="currentColor"
  >
    <circle cx="3.5" cy="8" r="1.3" />
    <circle cx="8" cy="8" r="1.3" />
    <circle cx="12.5" cy="8" r="1.3" />
  </svg>
);

/**
 * The Palette section of the sidebar: its colours (children), a preset to
 * start from, adding and importing colours, and everything else behind ⋯.
 */
export function PaletteSection({
  pen,
  palette,
  onPaletteChange,
  frameColors,
  fileName,
  children,
}: {
  pen: PenSettings;
  palette: string[];
  onPaletteChange: (palette: string[], change?: PaletteChange) => void;
  frameColors: () => string[];
  fileName: string;
  /** The swatches. */
  children: ReactNode;
}) {
  const [rampSteps, setRampSteps] = useState(6);
  const [problem, setProblem] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const saved = useSavedPalettes();
  const savePalette = (close: () => void) => {
    const name = saveName.trim().slice(0, 60);
    if (!name || !palette.length) return;
    setSaveName("");
    close();
    void saved.save(name, palette).then(setProblem);
  };
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

  const same = (colors: readonly string[]) =>
    colors.length === palette.length &&
    colors.every((color, i) => color === palette[i]);
  const current =
    PALETTE_PRESETS.find((preset) => same(preset.colors))?.id ??
    (saved.palettes.data ?? []).find((item) => same(item.colors))?.id ??
    CUSTOM;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Palette</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {palette.length} {palette.length === 1 ? "color" : "colors"}
        </span>
        {problem && (
          <span
            role="alert"
            title={problem}
            onClick={() => setProblem(null)}
            className="cursor-pointer truncate text-xs text-destructive"
          >
            {problem}
          </span>
        )}
        <span className="ml-auto">
          <HeaderMenu icon={DOTS} label="Palette options">
            {(close) => (
              <>
                <button
                  type="button"
                  disabled={!inPalette}
                  onClick={() => {
                    close();
                    onPaletteChange(palette.filter((c) => c !== pen.color));
                  }}
                  className={ITEM}
                >
                  Remove the primary colour
                </button>
                <span className={HEADING}>Ramp of shades</span>
                <span className="flex flex-col gap-2 p-1">
                  <span className="text-[11px] text-muted-foreground">
                    Shades from the primary to the secondary colour
                  </span>
                  <span className="flex h-5 overflow-hidden rounded-[2px] ring-1 ring-black/10">
                    {ramp.map((color, i) => (
                      <span
                        key={i}
                        className="flex-1"
                        style={swatchStyle(color)}
                      />
                    ))}
                  </span>
                  <span className="flex items-center gap-2">
                    <NumericInput
                      aria-label="Shades in the ramp"
                      min={MIN_RAMP}
                      max={MAX_RAMP}
                      value={rampSteps}
                      onValueChange={(next) =>
                        setRampSteps(
                          Math.min(
                            MAX_RAMP,
                            Math.max(MIN_RAMP, Math.round(next) || MIN_RAMP),
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

                <span className={HEADING}>Arrange</span>
                {[
                  ...PALETTE_SORTS,
                  { value: "reverse" as const, label: "Reverse order" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    disabled={palette.length < 2}
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
                ))}
                <span className="my-1 border-t" />
                <span className="px-2 pt-1 pb-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Your palettes
                </span>
                {saved.palettes.isPending ? (
                  <span className="px-2 py-1.5 text-xs text-muted-foreground">
                    Loading…
                  </span>
                ) : saved.palettes.isError ? (
                  <span className="px-2 py-1.5 text-xs text-destructive">
                    {saved.palettes.error.message}
                  </span>
                ) : (
                  saved.palettes.data.map((item) => (
                    <span
                      key={item.id}
                      className="group/saved flex items-center"
                    >
                      <button
                        type="button"
                        title={`${item.colors.length} colours`}
                        onClick={() => {
                          close();
                          onPaletteChange([...item.colors], { loaded: true });
                        }}
                        className={`${ITEM} min-w-0 flex-1 truncate`}
                      >
                        {item.name}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${item.name}`}
                        title="Delete from your palettes"
                        onClick={() =>
                          void saved.remove(item.id).then(setProblem)
                        }
                        className="size-6 shrink-0 rounded text-muted-foreground opacity-0 group-hover/saved:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
                <form
                  className="flex gap-1 px-1 py-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    savePalette(close);
                  }}
                >
                  <input
                    value={saveName}
                    maxLength={60}
                    placeholder="Name this palette"
                    aria-label="Name for the saved palette"
                    onChange={(e) => setSaveName(e.target.value)}
                    className="h-6 min-w-0 flex-1 rounded border bg-background px-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!saveName.trim() || !palette.length}
                    className="h-6 rounded border px-2 text-xs hover:bg-muted disabled:opacity-30"
                  >
                    Save
                  </button>
                </form>
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
                <button
                  type="button"
                  disabled={!palette.length}
                  onClick={() => {
                    close();
                    downloadBlob(
                      new Blob([toHexFile(palette)], { type: "text/plain" }),
                      `${safeFileBase(fileName)}.hex`,
                    );
                  }}
                  className={ITEM}
                >
                  Save as .hex
                </button>
                <button
                  type="button"
                  disabled={!palette.length}
                  title="One pixel per colour, in palette order"
                  onClick={() => {
                    close();
                    const strip = paletteStrip(palette);
                    downloadBlob(
                      new Blob([encodePng(strip.rgba, strip.w, strip.h)], {
                        type: "image/png",
                      }),
                      `${safeFileBase(fileName)}-palette.png`,
                    );
                  }}
                  className={ITEM}
                >
                  Save as PNG strip
                </button>
              </>
            )}
          </HeaderMenu>
        </span>
      </div>
      <label className="relative block">
        <span className="sr-only">Palette to start from</span>
        <select
          value={current}
          onChange={(e) => {
            const id = e.target.value;
            const colors =
              PALETTE_PRESETS.find((preset) => preset.id === id)?.colors ??
              (saved.palettes.data ?? []).find((item) => item.id === id)
                ?.colors;
            if (colors) onPaletteChange([...colors], { loaded: true });
          }}
          className="h-9 w-full cursor-pointer appearance-none rounded-lg border bg-background pr-8 pl-3 text-sm"
        >
          {current === CUSTOM && <option value={CUSTOM}>Custom</option>}
          <optgroup label="Presets">
            {PALETTE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </optgroup>
          {!!saved.palettes.data?.length && (
            <optgroup label="Your palettes">
              {saved.palettes.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted-foreground"
          fill="none"
        >
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </label>
      {children}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={inPalette || palette.length >= MAX_PALETTE}
          onClick={() => onPaletteChange([...palette, pen.color])}
          className={BUTTON}
        >
          <span aria-hidden="true">+</span> Add color
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className={BUTTON}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
          >
            <path
              d="M8 10V2.5M5 5.5l3-3 3 3M3 10.5V13h10v-2.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Import
        </button>
      </div>
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
    </div>
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
          className="fixed z-50 flex max-h-[70dvh] w-60 flex-col overflow-y-auto rounded-lg border bg-background p-1 text-foreground normal-case shadow-lg"
        >
          {children(() => setAt(null))}
        </span>
      )}
    </span>
  );
}
