"use client";

import { useOptimistic, useTransition } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { setTileLiked } from "@/app/(app)/explore/actions";

/** A heart and how many like the art; a click likes it or takes it back. */
export function LikeButton({
  tileId,
  count,
  liked,
}: {
  tileId: string;
  count: number;
  liked: boolean;
}) {
  const [state, apply] = useOptimistic(
    { liked, count },
    (_, next: boolean) => ({
      liked: next,
      count: count + (next === liked ? 0 : next ? 1 : -1),
    }),
  );
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const next = !state.liked;
      apply(next);
      await setTileLiked(tileId, next);
    });

  return (
    <button
      type="button"
      aria-pressed={state.liked}
      aria-label={state.liked ? "Unlike" : "Like"}
      disabled={pending}
      onClick={toggle}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium tabular-nums transition-colors hover:bg-muted",
        state.liked
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill={state.liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
        className="size-5"
      >
        <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />
      </svg>
      {state.count}
    </button>
  );
}
