"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { cn } from "@pigxel/ui/lib/utils";

export type GridSize = "large" | "medium" | "small";

const SIZES: { value: GridSize; label: string; cells: number }[] = [
  { value: "large", label: "Large cards", cells: 2 },
  { value: "medium", label: "Medium cards", cells: 3 },
  { value: "small", label: "Small cards", cells: 4 },
];

const isGridSize = (value: unknown): value is GridSize =>
  SIZES.some((size) => size.value === value);

/** A square of n×n cells, the size option's icon. */
function GridIcon({ cells }: { cells: number }) {
  const gap = 1.5;
  const cell = (14 - gap * (cells - 1)) / cells;
  return (
    <svg aria-hidden="true" viewBox="0 0 14 14" className="size-3.5">
      {Array.from({ length: cells * cells }, (_, i) => (
        <rect
          key={i}
          x={(i % cells) * (cell + gap)}
          y={Math.floor(i / cells) * (cell + gap)}
          width={cell}
          height={cell}
          rx={cells > 2 ? 0.6 : 1}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

/** Fewer large cards or more small cards, shared by browsing pages. */
export function GridSizeToggle({
  value,
  onChange,
  className,
}: {
  value: GridSize;
  onChange: (size: GridSize) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Card size"
      className={cn(
        "flex h-9 items-center gap-0.5 rounded-lg border border-[#e7c6d2] bg-background p-0.5",
        className,
      )}
    >
      {SIZES.map((size) => (
        <button
          key={size.value}
          type="button"
          role="radio"
          aria-checked={value === size.value}
          aria-label={size.label}
          title={size.label}
          onClick={() => onChange(size.value)}
          className="flex h-full w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground aria-checked:bg-pastel-pink-soft aria-checked:text-accent-pink"
        >
          <GridIcon cells={size.cells} />
        </button>
      ))}
    </div>
  );
}

/** Remember a page's preferred card size without changing the server render. */
export function useGridSize(storageKey: string) {
  const read = useCallback((): GridSize => {
    try {
      const saved = localStorage.getItem(storageKey);
      return isGridSize(saved) ? saved : "medium";
    } catch {
      return "medium";
    }
  }, [storageKey]);
  const saved = useSyncExternalStore(
    subscribeToStorage,
    read,
    () => "medium" as const,
  );
  const [picked, setPicked] = useState<GridSize | null>(null);
  const change = (next: GridSize) => {
    setPicked(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Still apply the selection when browser storage is unavailable.
    }
  };
  return [picked ?? saved, change] as const;
}

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
