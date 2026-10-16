"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { ASSET_BACKGROUNDS } from "@/features/assets/constants";
import { PILL } from "../constants";

export function SwatchPicker({
  value,
  disabled,
  onChange,
}: {
  value: string | null;
  disabled?: boolean;
  onChange: (background: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const pick = (background: string | null) => {
    setOpen(false);
    if (background !== value) onChange(background);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={PILL}
      >
        <span
          aria-hidden="true"
          className={cn("size-4 rounded border", !value && "bg-checker")}
          style={value ? { background: value } : undefined}
        />
        Background
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Card background"
          className="absolute right-0 z-20 mt-2 w-56 rounded-xl border bg-background p-3 shadow-lg"
        >
          <div className="grid grid-cols-5 gap-2">
            {ASSET_BACKGROUNDS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                aria-label={color}
                aria-pressed={value === color}
                onClick={() => pick(color)}
                className="size-8 cursor-pointer rounded-md border transition-shadow aria-pressed:ring-2 aria-pressed:ring-primary aria-pressed:ring-offset-1"
                style={{ background: color }}
              />
            ))}
          </div>
          <button
            type="button"
            aria-pressed={value === null}
            onClick={() => pick(null)}
            className={cn(PILL, "mt-3 h-8 w-full justify-center")}
          >
            Default pastel
          </button>
        </div>
      )}
    </div>
  );
}
