"use client";

import { useEffect, useRef } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";

export default function HistoryDialog({
  steps,
  current,
  onPick,
  onClose,
}: {
  steps: string[];
  current: number;
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef<HTMLButtonElement>(null);
  useEffect(() => dialog.current?.showModal(), []);
  useEffect(() => {
    active.current?.scrollIntoView({ block: "nearest" });
  }, [current, steps.length]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="history-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <SectionTitle id="history-title">History</SectionTitle>
          <Lead className="mt-1">
            Click a step to go back or forward to it.
          </Lead>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={() => dialog.current?.close()}
          className="text-lg leading-none"
        >
          ×
        </Button>
      </div>
      <ol
        aria-label="Undo history"
        className="max-h-[60dvh] overflow-y-auto p-2 text-sm"
      >
        {steps.map((label, i) => (
          <li key={i}>
            <button
              ref={i === current ? active : undefined}
              type="button"
              aria-current={i === current ? "step" : undefined}
              title={
                i === current
                  ? "You are here"
                  : i < current
                    ? "Go back to this step"
                    : "Go forward to this step"
              }
              onClick={() => onPick(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-muted",
                i === current && "bg-primary/15 font-semibold text-foreground",
                i > current && "text-muted-foreground/60 italic",
              )}
            >
              <span className="w-7 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {i}
              </span>
              <span className="truncate">{label}</span>
            </button>
          </li>
        ))}
      </ol>
    </dialog>
  );
}
