"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import {
  defaultScale,
  DOWNLOAD_FORMATS,
  downloadScales,
  type DownloadFormat,
} from "../download";

export function DownloadMenu({
  width,
  height,
  animated,
  disabled,
  onDownload,
}: {
  width: number;
  height: number;
  animated: boolean;
  disabled: boolean;
  onDownload: (format: DownloadFormat, scale: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(() => defaultScale(width, height));
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const formats = animated
    ? DOWNLOAD_FORMATS
    : DOWNLOAD_FORMATS.filter((f) => f.value !== "sheet");

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

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-xs transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-60"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <path d="M8 2v8.5M4.5 7 8 10.5 11.5 7M2 10.5V12a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 14 12v-1.5" />
        </svg>
        Download
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3">
          <path
            d="m4 6 4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          aria-label="Download format"
          className="absolute top-full left-0 z-20 mt-1 min-w-56 rounded-lg border bg-popover p-1 text-xs shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <li role="none" className="px-2.5 pt-1.5 pb-2">
            <span className="mb-1.5 flex justify-between text-[10px] text-muted-foreground">
              Scale
              <span className="tabular-nums">
                {width * scale} × {height * scale} px
              </span>
            </span>
            <span role="group" aria-label="Scale" className="flex gap-1">
              {downloadScales(width, height).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={option === scale}
                  onClick={() => setScale(option)}
                  className={cn(
                    "h-6 flex-1 cursor-pointer rounded-md border text-[11px] tabular-nums transition-colors hover:bg-muted",
                    option === scale &&
                      "border-transparent bg-pastel-pink hover:bg-pastel-pink",
                  )}
                >
                  {option}×
                </button>
              ))}
            </span>
          </li>
          <li role="separator" className="my-1 border-t" />
          {formats.map((format) => (
            <li key={format.value} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDownload(format.value, scale);
                }}
                className="flex w-full cursor-pointer items-baseline justify-between gap-4 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-secondary"
              >
                <span className="font-medium">{format.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {format.value === "png" && animated
                    ? "First frame"
                    : format.hint}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
