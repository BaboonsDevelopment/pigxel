"use client";

import { useOptimistic, useTransition } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { setVote } from "./actions";

export function VoteButton({
  id,
  title,
  votes,
  voted,
  open,
}: {
  id: number;
  title: string;
  votes: number;
  voted: boolean;
  open: boolean;
}) {
  const [shown, show] = useOptimistic({ votes, voted });
  const [, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const next = !shown.voted;
      show({ voted: next, votes: shown.votes + (next ? 1 : -1) });
      await setVote(id, next);
    });

  const box =
    "flex w-14 shrink-0 flex-col items-center rounded-xl border py-1.5 text-sm font-semibold tabular-nums";
  if (!open)
    return (
      <span
        className={cn(box, "text-muted-foreground")}
        title={`${shown.votes} vote${shown.votes === 1 ? "" : "s"}`}
      >
        <Arrow />
        {shown.votes}
      </span>
    );
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={shown.voted}
      aria-label={`${shown.voted ? "Take back your vote for" : "Vote for"} “${title}”, ${shown.votes} vote${shown.votes === 1 ? "" : "s"}`}
      className={cn(
        box,
        "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        shown.voted
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:border-primary hover:text-primary",
      )}
    >
      <Arrow />
      {shown.votes}
    </button>
  );
}

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5">
      <path d="M8 3.5 13 10H3Z" fill="currentColor" />
    </svg>
  );
}
