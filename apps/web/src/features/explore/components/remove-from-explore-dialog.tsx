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
  width?: number;
  height?: number;
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
  return (
    <>
      <ModalHeader title="Unpublish Artwork" className="bg-attention-soft" />
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
            {art.width && art.height && (
              <span className="block text-[11px] text-muted-foreground tabular-nums">
                {art.width} × {art.height} px
              </span>
            )}
          </span>
        </div>
        <p
          id="remove-from-explore-message"
          className="flex items-start gap-3 rounded-xl bg-pastel-pink-soft px-4 py-3 text-sm"
        >
          <PixelImage
            src="/art/icons/warning-icon.png"
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0"
          />
          The artwork will disappear from Explore but remain in My Projects.
        </p>
        <p className="text-xs text-muted-foreground">
          You can publish it again whenever you’re ready.
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
          Unpublish
        </ModalButton>
      </DialogFooter>
    </>
  );
}
