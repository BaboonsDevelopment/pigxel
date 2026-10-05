"use client";

import { useState, useTransition } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { setTileLiked } from "../../../actions";
import { formatCount } from "../helpers";

export function LikeButton({
  tileId,
  count,
  liked,
}: {
  tileId: string;
  count: number;
  liked: boolean;
}) {
  const [state, setState] = useState({ liked, count });
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const before = state;
      const next = !before.liked;
      setState({ liked: next, count: before.count + (next ? 1 : -1) });
      const result = await setTileLiked(tileId, next);
      if (result.error) setState(before);
    });

  return (
    <button
      type="button"
      aria-pressed={state.liked}
      aria-label={state.liked ? "Unlike" : "Like"}
      disabled={pending}
      onClick={toggle}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-md py-0.5 tabular-nums transition-colors hover:text-primary",
        state.liked && "text-primary",
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="3.4 4.9 17.2 16.2"
        fill={state.liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
        className="h-2 w-[8.5px]"
      >
        <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />
      </svg>
      {formatCount(state.count)}
    </button>
  );
}
