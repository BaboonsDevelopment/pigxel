"use client";

import { cn } from "@pigxel/ui/lib/utils";

/** A heart that marks something as a favourite. */
export function FavouriteButton({
  on,
  label,
  onChange,
  className,
}: {
  on: boolean;
  /** What it marks, for screen readers: "Dungeon Heroes". */
  label: string;
  onChange: (on: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={
        on ? `Remove ${label} from favourites` : `Add ${label} to favourites`
      }
      title={on ? "Favourite" : "Add to favourites"}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onChange(!on);
      }}
      className={cn(
        "flex size-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-110 motion-reduce:transition-none",
        on
          ? "text-pink-strong"
          : "text-muted-foreground hover:text-pink-strong",
        className,
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
        <path
          d="M8 14s-5.5-3.3-5.5-7.4A3 3 0 0 1 8 4.4a3 3 0 0 1 5.5 2.2C13.5 10.7 8 14 8 14Z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
