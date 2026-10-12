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
import { HeaderButton } from "../dock/header-button";
import { swatchStyle } from "./helpers";
import { PALETTE_ICONS } from "./icons";
import { useSavedPalettes } from "./saved-palettes";

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
                <span key={item.id} className="group/saved flex items-center">
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
                    onClick={() => void saved.remove(item.id).then(setProblem)}
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
