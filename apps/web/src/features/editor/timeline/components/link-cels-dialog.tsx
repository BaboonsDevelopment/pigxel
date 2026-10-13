"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { SizeField } from "../../components/size-controls";

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
      <ModalHeader title="Link Cels" className="bg-attention-soft" />
      <DialogBody className="py-5">
        <form
          id="link-cels-form"
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            onApply(start - 1, end - 1);
            (
              event.currentTarget.closest("dialog") as HTMLDialogElement
            ).close();
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <SizeField
              id="link-from"
              label="From frame"
              unit=""
              value={from}
              onChange={setFrom}
            />
            <SizeField
              id="link-to"
              label="To frame"
              unit=""
              value={to}
              onChange={setTo}
            />
          </div>
          <p className="rounded-xl bg-attention-soft px-4 py-3 text-sm">
            The cel in frame {sourceIndex + 1} will replace the cels in this
            range. Future edits to any linked cel will appear in all of them.
          </p>
        </form>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <LinkButtons valid={valid} />
      </DialogFooter>
    </Dialog>
  );
}

function LinkButtons({ valid }: { valid: boolean }) {
  const { close } = useDialog();
  return (
    <>
      <ModalButton variant="secondary" onClick={close}>
        Cancel
      </ModalButton>
      <ModalButton type="submit" form="link-cels-form" disabled={!valid}>
        Link cels
      </ModalButton>
    </>
  );
}
