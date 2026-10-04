"use client";

import { useState, type PointerEvent } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import {
  hexToHsv,
  hslToHsv,
  hsvToHex,
  hsvToHsl,
  readHex,
  shadesOf,
  type Hsv,
} from "@/lib/palette/hsv";

const HUES =
  "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";

export function ColorPicker({
  color,
  onChange,
  alpha,
  onAlpha,
}: {
  color: string;
  onChange: (color: string) => void;
  alpha?: number;
  onAlpha?: (alpha: number) => void;
}) {
  const [model, setModel] = useState<"hsv" | "hsl">("hsv");
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(color));
  const [shown, setShown] = useState(color);
  const [text, setText] = useState(color);
  if (color !== shown) {
    setShown(color);
    setText(color);
    if (color !== hsvToHex(hsv)) {
      const next = hexToHsv(color);
      setHsv(next.s && next.v ? next : { ...next, h: hsv.h });
    }
  }

  const change = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setShown(hex);
    setText(hex);
    onChange(hex);
  };

  const drag = (
    e: PointerEvent<HTMLElement>,
    apply: (fx: number, fy: number) => void,
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const at = (x: number, y: number) => {
      const r = el.getBoundingClientRect();
      apply(
        Math.min(1, Math.max(0, (x - r.left) / r.width)),
        Math.min(1, Math.max(0, (y - r.top) / r.height)),
      );
    };
    at(e.clientX, e.clientY);
    const move = (event: globalThis.PointerEvent) =>
      at(event.clientX, event.clientY);
    const end = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  };

  const commitText = () => {
    const hex = readHex(text);
    if (hex) {
      if (hex !== color) onChange(hex);
      setText(hex);
    } else setText(color);
  };

  return (
    <div className="flex flex-col gap-2 select-none">
      <div
        role="slider"
        aria-label="Saturation and brightness"
        aria-valuenow={Math.round(hsv.v * 100)}
        aria-valuetext={`saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        tabIndex={0}
        onPointerDown={(e) =>
          drag(e, (fx, fy) => change({ ...hsv, s: fx, v: 1 - fy }))
        }
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.1 : 0.01;
          const moves: Record<string, Partial<Hsv>> = {
            ArrowLeft: { s: Math.max(0, hsv.s - step) },
            ArrowRight: { s: Math.min(1, hsv.s + step) },
            ArrowUp: { v: Math.min(1, hsv.v + step) },
            ArrowDown: { v: Math.max(0, hsv.v - step) },
          };
          if (!moves[e.key]) return;
          e.preventDefault();
          change({ ...hsv, ...moves[e.key] });
        }}
        className="relative aspect-[4/3] w-full cursor-crosshair touch-none overflow-hidden rounded-md ring-1 ring-black/15 focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <div
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        tabIndex={0}
        onPointerDown={(e) => drag(e, (fx) => change({ ...hsv, h: fx * 360 }))}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 15 : 1;
          const delta =
            e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          if (!delta) return;
          e.preventDefault();
          change({ ...hsv, h: (hsv.h + delta + 360) % 360 });
        }}
        className="relative h-3 w-full cursor-pointer touch-none rounded-full ring-1 ring-black/15 focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ backgroundImage: HUES }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 h-4 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
          style={{
            left: `${(hsv.h / 360) * 100}%`,
            backgroundColor: `hsl(${hsv.h} 100% 50%)`,
          }}
        />
      </div>

      {onAlpha && alpha !== undefined && (
        <div
          role="slider"
          aria-label="Alpha"
          aria-valuemin={0}
          aria-valuemax={255}
          aria-valuenow={alpha}
          tabIndex={0}
          title={`Alpha ${alpha} · the pen's opacity`}
          onPointerDown={(e) => drag(e, (fx) => onAlpha(Math.round(fx * 255)))}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 16 : 1;
            const delta =
              e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
            if (!delta) return;
            e.preventDefault();
            onAlpha(Math.min(255, Math.max(0, alpha + delta)));
          }}
          className="relative h-3 w-full cursor-pointer touch-none rounded-full bg-checker ring-1 ring-black/15 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: `linear-gradient(to right, transparent, ${color})`,
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 h-4 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
            style={{ left: `${(alpha / 255) * 100}%`, backgroundColor: color }}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex gap-1 self-start rounded-md bg-muted p-0.5 text-[10px] font-medium">
          {(["hsv", "hsl"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={model === m}
              onClick={() => setModel(m)}
              className={cn(
                "rounded px-2 py-0.5 uppercase",
                model === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        {model === "hsv" ? (
          <>
            <Channel
              label="H"
              max={360}
              value={hsv.h}
              onChange={(h) => change({ ...hsv, h })}
            />
            <Channel
              label="S"
              max={100}
              value={hsv.s * 100}
              onChange={(v) => change({ ...hsv, s: v / 100 })}
            />
            <Channel
              label="V"
              max={100}
              value={hsv.v * 100}
              onChange={(v) => change({ ...hsv, v: v / 100 })}
            />
          </>
        ) : (
          (() => {
            const hsl = hsvToHsl(hsv);
            const set = (patch: Partial<typeof hsl>) =>
              change(hslToHsv({ ...hsl, ...patch }));
            return (
              <>
                <Channel
                  label="H"
                  max={360}
                  value={hsl.h}
                  onChange={(h) => set({ h })}
                />
                <Channel
                  label="S"
                  max={100}
                  value={hsl.s * 100}
                  onChange={(v) => set({ s: v / 100 })}
                />
                <Channel
                  label="L"
                  max={100}
                  value={hsl.l * 100}
                  onChange={(v) => set({ l: v / 100 })}
                />
              </>
            );
          })()
        )}
        {onAlpha && alpha !== undefined && (
          <Channel label="A" max={255} value={alpha} onChange={onAlpha} />
        )}
      </div>

      <div className="flex gap-0.5" role="group" aria-label="Shades">
        {shadesOf(color).map((shade, i) => (
          <button
            key={i}
            type="button"
            title={i === 3 ? shade : `${i < 3 ? "Shadow" : "Light"} ${shade}`}
            aria-label={shade}
            onClick={() => onChange(shade)}
            className={cn(
              "h-5 flex-1 rounded-[2px] ring-1 ring-black/10",
              i === 3 && "ring-2 ring-foreground",
            )}
            style={{ backgroundColor: shade }}
          />
        ))}
      </div>

      <input
        aria-label="Colour as hex"
        value={text}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitText();
          if (e.key === "Escape") setText(color);
        }}
        className="h-7 w-full rounded-md border bg-background px-2 text-center font-mono text-xs tabular-nums uppercase"
      />
    </div>
  );
}

function Channel({
  label,
  max,
  value,
  onChange,
}: {
  label: string;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const shown = Math.round(value);
  return (
    <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
      <span className="w-3 font-medium">{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        value={shown}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 accent-primary"
      />
      <input
        type="number"
        min={0}
        max={max}
        value={shown}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(n))
            onChange(Math.min(max, Math.max(0, n)));
        }}
        className="h-6 w-11 rounded border bg-background px-1 text-right tabular-nums text-foreground"
      />
    </label>
  );
}
