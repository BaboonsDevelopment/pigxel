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
import { PixelImage } from "@/components/ui/pixel-image";

export type RemovedArt = {
  id: string;
  name: string;
  thumbnail?: string | null;
  tags?: string[];
};

export function confirmRemoveFromExplore(art: RemovedArt): Promise<boolean> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  return new Promise((resolve) => {
    root.render(
      <RemoveDialog
        art={art}
        onDone={(confirmed) => {
          resolve(confirmed);
          root.unmount();
          host.remove();
        }}
      />,
    );
  });
}

function RemoveDialog({
  art,
  onDone,
}: {
  art: RemovedArt;
  onDone: (confirmed: boolean) => void;
}) {
  const confirmed = useRef(false);
  return (
    <Dialog
      size="sm"
      onClose={() => onDone(confirmed.current)}
      aria-describedby="remove-from-explore-message"
    >
      <RemoveBody art={art} onConfirm={() => (confirmed.current = true)} />
    </Dialog>
  );
}

function RemoveBody({
  art,
  onConfirm,
}: {
  art: RemovedArt;
  onConfirm: () => void;
}) {
  const { close } = useDialog();
  const tag = art.tags?.[0];
  return (
    <>
      <ModalHeader title="Delete Published Art" className="bg-attention-soft" />
      <DialogBody className="grid gap-4 py-5">
        <div className="flex items-center gap-4">
          <span className="block size-20 shrink-0 overflow-hidden rounded-xl border border-primary-soft bg-pastel-pink-soft">
            {art.thumbnail && (
              <PixelImage
                src={art.thumbnail}
                alt=""
                className="size-full object-contain"
              />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {art.name}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Published{tag ? ` · ${tag}` : ""}
            </span>
          </span>
        </div>
        <p id="remove-from-explore-message" className="text-sm">
          This artwork will be permanently removed from the gallery, including
          its likes and comments. This action cannot be undone.
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
          Delete
        </ModalButton>
      </DialogFooter>
    </>
  );
}
