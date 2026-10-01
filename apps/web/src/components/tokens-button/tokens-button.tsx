"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { getAiBalance } from "@/lib/ai/actions";
import { AI_SPENT_EVENT } from "@/lib/ai/spent-event";
import { UsageDialog } from "./components/usage-dialog/usage-dialog";
import { tokens } from "./components/usage-dialog/helpers";

/**
 * The AI tokens left, always in sight: a pixel coin and the number. A click
 * opens the history of what was spent.
 */
export function TokensButton({ className }: { className?: string }) {
  const [left, setLeft] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const read = useCallback(() => {
    getAiBalance()
      .then((balance) => setLeft(balance.left))
      .catch(() => {});
  }, []);

  useEffect(() => {
    read();
    window.addEventListener(AI_SPENT_EVENT, read);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener(AI_SPENT_EVENT, read);
      window.removeEventListener("focus", read);
    };
  }, [read]);

  const empty = left !== null && left <= 0;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Your AI tokens — see what you spent"
        className={cn(
          "group flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-background py-1 pr-3 pl-1.5 font-mono text-sm font-semibold tabular-nums shadow-sm transition-colors hover:bg-muted",
          empty && "text-destructive",
          className,
        )}
      >
        <PixelCoin className="size-6 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
        {left === null ? "…" : tokens(left)}
        <span className="sr-only"> AI tokens left</span>
      </button>
      {open && (
        <UsageDialog
          onClose={() => {
            setOpen(false);
            read();
          }}
        />
      )}
    </>
  );
}

/** A gold coin drawn in pixels, with a shine and a sparkle. */
function PixelCoin({ className }: { className?: string }) {
  const px = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect
      key={`${x}-${y}-${fill}`}
      x={x}
      y={y}
      width={w}
      height={h}
      fill={fill}
    />
  );
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      className={className}
    >
      {/* Outline */}
      {px(3, 0, 5, 1, "#8a4b08")}
      {px(1, 1, 2, 1, "#8a4b08")}
      {px(8, 1, 2, 1, "#8a4b08")}
      {px(0, 3, 1, 5, "#8a4b08")}
      {px(1, 2, 1, 1, "#8a4b08")}
      {px(9, 2, 1, 1, "#8a4b08")}
      {px(10, 3, 1, 5, "#8a4b08")}
      {px(1, 8, 1, 1, "#8a4b08")}
      {px(9, 8, 1, 1, "#8a4b08")}
      {px(1, 9, 2, 1, "#8a4b08")}
      {px(8, 9, 2, 1, "#8a4b08")}
      {px(3, 10, 5, 1, "#8a4b08")}
      {/* Gold face */}
      {px(3, 1, 5, 9, "#f5b41a")}
      {px(2, 2, 7, 7, "#f5b41a")}
      {px(1, 3, 9, 5, "#f5b41a")}
      {/* Shade on the lower right */}
      {px(8, 3, 1, 5, "#d98a0b")}
      {px(3, 8, 6, 1, "#d98a0b")}
      {px(9, 4, 1, 3, "#d98a0b")}
      {/* Engraved "P" */}
      {px(4, 3, 1, 5, "#b86a08")}
      {px(5, 3, 2, 1, "#b86a08")}
      {px(6, 4, 1, 1, "#b86a08")}
      {px(5, 5, 2, 1, "#b86a08")}
      {/* Shine */}
      {px(2, 3, 1, 2, "#fff1b8")}
      {px(3, 2, 1, 1, "#fff1b8")}
      {/* Sparkle */}
      {px(10, 0, 1, 1, "#fff6d6")}
      {px(11, 1, 1, 1, "#fff6d6")}
    </svg>
  );
}
