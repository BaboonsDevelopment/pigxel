"use client";

import { useRef } from "react";
import { createRoot } from "react-dom/client";
import { ModalButton } from "@/components/ui/modal-button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";

export function confirmClearCanvas(): Promise<boolean> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  return new Promise((resolve) => {
    root.render(
      <ClearDialog
        onDone={(confirmed) => {
          resolve(confirmed);
          root.unmount();
          host.remove();
        }}
      />,
    );
  });
}

function ClearDialog({ onDone }: { onDone: (confirmed: boolean) => void }) {
  const confirmed = useRef(false);
  return (
    <Dialog
      size="sm"
      onClose={() => onDone(confirmed.current)}
      aria-describedby="clear-canvas-message"
    >
      <ClearBody onConfirm={() => (confirmed.current = true)} />
    </Dialog>
  );
}

function ClearBody({ onConfirm }: { onConfirm: () => void }) {
  const { close } = useDialog();
  return (
    <>
      <ModalHeader title="Clear Canvas" className="bg-attention-soft" />
      <DialogBody className="grid gap-4 py-5">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-pastel-pink">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="size-6 text-undo-surface"
            >
              <path d="M8 2 1.5 13.5h13Z" />
              <path d="M8 6.5v3.5M8 11.8v.2" />
            </svg>
          </span>
          <p className="text-sm">Are you sure you want to clear this canvas?</p>
        </div>
        <p id="clear-canvas-message" className="text-sm">
          All content on the canvas will be cleared. Your project and canvas
          size will stay the same.
        </p>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton
          type="button"
          variant="secondary"
          autoFocus
          onClick={close}
        >
          Cancel
        </ModalButton>
        <ModalButton
          type="button"
          onClick={() => {
            onConfirm();
            close();
          }}
        >
          Clear
        </ModalButton>
      </DialogFooter>
    </>
  );
}
