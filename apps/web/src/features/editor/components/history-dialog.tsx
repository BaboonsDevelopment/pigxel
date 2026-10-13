"use client";

import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";

type HistoryProps = {
  steps: string[];
  current: number;
  onPick: (index: number) => void;
};

export default function HistoryDialog({
  onClose,
  ...props
}: HistoryProps & { onClose: () => void }) {
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <HistoryList {...props} />
    </Dialog>
  );
}

function HistoryList({ steps, current, onPick }: HistoryProps) {
  const { close } = useDialog();
  const active = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    active.current?.scrollIntoView({ block: "nearest" });
  }, [current, steps.length]);

  return (
    <>
      <ModalHeader title="History" />
      <DialogBody className="grid gap-4 py-5">
        <p className="-mb-1 text-sm text-muted-foreground">
          Click a step to go back or forward to it.
        </p>
        <ol
          aria-label="Undo history"
          className="grid max-h-[50dvh] gap-1 overflow-y-auto rounded-xl border bg-background p-2 text-sm"
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
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                  i === current
                    ? "bg-pastel-pink-soft font-semibold"
                    : "hover:bg-muted/60",
                  i > current && "text-muted-foreground",
                )}
              >
                <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {i}
                </span>
                <span className="truncate">{label}</span>
              </button>
            </li>
          ))}
        </ol>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Close
        </ModalButton>
      </DialogFooter>
    </>
  );
}
