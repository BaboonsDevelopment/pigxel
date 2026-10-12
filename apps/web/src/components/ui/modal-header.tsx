"use client";

import { IconButton } from "@pigxel/ui/components/button";
import { useDialog } from "@pigxel/ui/components/dialog";
import { cn } from "@pigxel/ui/lib/utils";
import { madimiOne } from "@/lib/fonts/madimi";

export const MODAL_FOOTER = "bg-pink-base py-4";

export function ModalHeader({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  const { close, titleId } = useDialog();
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 bg-pink-base px-5 py-4",
        className,
      )}
    >
      <h2
        id={titleId}
        className={cn(
          madimiOne.className,
          "text-2xl leading-[30px] text-undo-surface",
        )}
      >
        {title}
      </h2>
      <IconButton
        label="Close"
        onClick={close}
        className="size-9 rounded-lg bg-background text-muted-foreground hover:text-foreground"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          className="size-5"
        >
          <path d="m3 3 10 10M13 3 3 13" />
        </svg>
      </IconButton>
    </div>
  );
}
