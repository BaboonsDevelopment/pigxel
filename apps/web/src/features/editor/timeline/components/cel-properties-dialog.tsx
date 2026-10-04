"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  useDialog,
} from "@pigxel/ui/components/dialog";

export function CelPropertiesDialog({
  layerName,
  frameNumber,
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
      <DialogHeader title="Cel properties" />
      <DialogBody>
        <form
          id="cel-properties"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(opacity, zIndex);
            (
              event.currentTarget.closest("dialog") as HTMLDialogElement
            ).close();
          }}
        >
          <p className="text-sm text-muted-foreground">
            {layerName} · Frame {frameNumber}
          </p>
          <label className="block text-sm">
            <span className="mb-1 block">
              Opacity: {Math.round((opacity / 255) * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={255}
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
              className="w-full accent-primary"
            />
          </label>
          {zCount > 1 && (
            <label className="block text-sm">
              <span className="mb-1 block">
                Order in this frame: {zIndex + 1} of {zCount}
              </span>
              <input
                type="range"
                min={0}
                max={zCount - 1}
                value={zIndex}
                onChange={(event) => setZIndex(Number(event.target.value))}
                className="w-full accent-primary"
              />
              <span className="flex justify-between text-xs text-muted-foreground">
                <span>Back</span>
                <span>Front</span>
              </span>
            </label>
          )}
        </form>
      </DialogBody>
      <DialogFooter>
        <Actions />
      </DialogFooter>
    </Dialog>
  );
}

function Actions() {
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
        form="cel-properties"
        className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
      >
        Save
      </button>
    </div>
  );
}
