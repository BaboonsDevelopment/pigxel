"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  useDialog,
} from "@pigxel/ui/components/dialog";

export function LinkCelsDialog({
  frameCount,
  sourceIndex,
  onApply,
  onClose,
}: {
  frameCount: number;
  sourceIndex: number;
  onApply: (from: number, to: number) => void;
  onClose: () => void;
}) {
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState(String(frameCount));
  const start = Number(from);
  const end = Number(to);
  const valid =
    from !== "" &&
    to !== "" &&
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    start >= 1 &&
    end <= frameCount &&
    end > start &&
    sourceIndex + 1 >= start &&
    sourceIndex + 1 <= end;
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <DialogHeader
        title="Link cels"
        description={`The cel in frame ${sourceIndex + 1} will replace the cels in this range. Future edits to any linked cel will appear in all of them.`}
      />
      <DialogBody>
        <form
          id="link-cels-form"
          className="flex gap-3 text-sm"
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            onApply(start - 1, end - 1);
            (
              event.currentTarget.closest("dialog") as HTMLDialogElement
            ).close();
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="mb-1 block">From frame</span>
            <input
              type="number"
              min={1}
              max={frameCount}
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2"
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block">To frame</span>
            <input
              type="number"
              min={1}
              max={frameCount}
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2"
            />
          </label>
        </form>
      </DialogBody>
      <DialogFooter>
        <LinkButtons valid={valid} />
      </DialogFooter>
    </Dialog>
  );
}

function LinkButtons({ valid }: { valid: boolean }) {
  const { close } = useDialog();
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={close}
        className="rounded-md border px-3 py-1.5 text-sm"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="link-cels-form"
        disabled={!valid}
        className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-40"
      >
        Link cels
      </button>
    </div>
  );
}
