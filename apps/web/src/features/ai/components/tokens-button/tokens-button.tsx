"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";
import { getAiBalance } from "../../actions";
import { AI_SPENT_EVENT } from "../../spent-event";
import { UsageDialog } from "./components/usage-dialog/usage-dialog";
import { tokens } from "./components/usage-dialog/helpers";

export function TokensButton({
  className,
  card = false,
}: {
  className?: string;
  card?: boolean;
}) {
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
      {card ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Your AI tokens — see what you spent"
          className={cn(
            "group flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border bg-background py-2 pr-2.5 pl-2 text-left shadow-sm transition-colors hover:bg-muted",
            className,
          )}
        >
          <PixelCoin className="h-8 transition-transform duration-300 group-hover:rotate-12" />
          <span className="grid leading-tight">
            <span className="text-xs font-medium">AI tokens</span>
            <span
              className={cn(
                "text-[10px] text-muted-foreground tabular-nums",
                empty && "text-destructive",
              )}
            >
              {left === null ? "…" : `${tokens(left)} left in your plan`}
            </span>
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            className="ml-2 size-4 text-muted-foreground"
          >
            <circle cx="8" cy="8" r="6" />
            <path d="M8 7.3v3.7M8 5v.2" />
          </svg>
        </button>
      ) : (
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
          <PixelCoin className="h-6 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
          {left === null ? "…" : tokens(left)}
          <span className="sr-only"> AI tokens left</span>
        </button>
      )}
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

function PixelCoin({ className }: { className?: string }) {
  return (
    <PixelImage
      src="/art/coins-icon.png"
      alt=""
      width={23}
      height={30}
      className={cn("w-auto", className)}
    />
  );
}
