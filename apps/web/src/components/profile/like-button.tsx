"use client";

import { useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";

/** A heart and how many like the art. For now only the look: nothing is saved. */
export function LikeButton({ count }: { count: number }) {
  const [liked, setLiked] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      onClick={() => setLiked(!liked)}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium tabular-nums transition-colors hover:bg-muted",
        liked ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
        className="size-5"
      >
        <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />
      </svg>
      {count + (liked ? 1 : 0)}
    </button>
  );
}
