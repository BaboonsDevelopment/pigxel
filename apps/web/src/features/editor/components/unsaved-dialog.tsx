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

type UnsavedChoice = "save" | "discard";

export function confirmUnsaved(name: string): Promise<UnsavedChoice | null> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  return new Promise((resolve) => {
    root.render(
      <UnsavedDialog
        name={name}
        onDone={(choice) => {
          resolve(choice);
          root.unmount();
          host.remove();
        }}
      />,
    );
  });
}

function UnsavedDialog({
  name,
  onDone,
}: {
  name: string;
  onDone: (choice: UnsavedChoice | null) => void;
}) {
  const choice = useRef<UnsavedChoice | null>(null);
  return (
    <Dialog
      size="sm"
      onClose={() => onDone(choice.current)}
      aria-describedby="unsaved-message"
    >
      <UnsavedBody name={name} onChoose={(next) => (choice.current = next)} />
    </Dialog>
  );
}

function UnsavedBody({
  name,
  onChoose,
}: {
  name: string;
  onChoose: (choice: UnsavedChoice) => void;
}) {
  const { close } = useDialog();
  const choose = (next: UnsavedChoice) => {
    onChoose(next);
    close();
  };
  return (
    <>
      <ModalHeader title="Unsaved Changes" className="bg-attention-soft" />
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
          <p id="unsaved-message" className="text-sm">
            You have unsaved changes. What would you like to do?
          </p>
        </div>
        <p className="truncate text-xs text-muted-foreground">{name}</p>
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
          variant="secondary"
          onClick={() => choose("discard")}
        >
          Don’t Save
        </ModalButton>
        <ModalButton type="button" onClick={() => choose("save")}>
          Save
        </ModalButton>
      </DialogFooter>
    </>
  );
}
