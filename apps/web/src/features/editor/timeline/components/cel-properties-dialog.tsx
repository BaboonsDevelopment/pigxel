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

const SLIDER = "flex items-center gap-3 text-sm";

export function CelPropertiesDialog({
  opacity: initialOpacity,
  zIndex: initialZIndex,
  zCount,
  onSave,
  onClose,
}: {
  layerName: string;
  frameNumber: number;
  opacity: number;
  zIndex: number;
  zCount: number;
  onSave: (opacity: number, zIndex: number) => void;
  onClose: () => void;
}) {
  const [opacity, setOpacity] = useState(initialOpacity);
  const [zIndex, setZIndex] = useState(initialZIndex);
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <ModalHeader title="Cel Properties" />
      <DialogBody className="py-5">
        <form
          id="cel-properties"
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(opacity, zIndex);
            (
              event.currentTarget.closest("dialog") as HTMLDialogElement
            ).close();
          }}
        >
          <label className={SLIDER}>
            <span className="w-16 font-semibold">Opacity</span>
            <input
              type="range"
              min={0}
              max={255}
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
              className="min-w-0 flex-1 accent-pink-strong"
            />
            <span className="w-10 text-right tabular-nums">
              {Math.round((opacity / 255) * 100)}%
            </span>
          </label>
          {zCount > 1 && (
            <div>
              <label className={SLIDER}>
                <span className="w-16 font-semibold">Order</span>
                <input
                  type="range"
                  min={0}
                  max={zCount - 1}
                  value={zIndex}
                  onChange={(event) => setZIndex(Number(event.target.value))}
                  className="min-w-0 flex-1 accent-pink-strong"
                />
                <span className="w-10 text-right tabular-nums">
                  {zIndex + 1}/{zCount}
                </span>
              </label>
              <span className="mt-1 flex justify-between pr-13 pl-19 text-xs text-muted-foreground">
                <span>Back</span>
                <span>Front</span>
              </span>
            </div>
          )}
        </form>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <Actions />
      </DialogFooter>
    </Dialog>
  );
}

function Actions() {
  const { close } = useDialog();
  return (
    <>
      <ModalButton variant="secondary" onClick={close}>
        Cancel
      </ModalButton>
      <ModalButton type="submit" form="cel-properties">
        Save
      </ModalButton>
    </>
  );
}
