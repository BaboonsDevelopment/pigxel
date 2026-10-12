"use client";

import { Dialog, DialogBody, DialogFooter } from "@pigxel/ui/components/dialog";
import { cn } from "@pigxel/ui/lib/utils";
import { FormMessage } from "@pigxel/ui/components/field";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { PixelImage } from "@/components/ui/pixel-image";
import { useProjectSharing } from "../../queries";
import { LinkAccessSection } from "./components/link-access-section";

export function ShareDialog({
  tile,
  onClose,
}: {
  tile: {
    id: string;
    name: string;
    thumbnail?: string | null;
    width?: number;
    height?: number;
  };
  onClose: () => void;
}) {
  const share = useProjectSharing(tile.id);

  const shared =
    !!share.sharing &&
    (share.sharing.people.length > 0 || share.sharing.link.access !== "off");

  const stop = async () => {
    const confirmed = await confirmDialog({
      title: `Stop sharing “${tile.name}”?`,
      message:
        "Everyone loses access, open invitations are cancelled and the link stops working. The project stays yours.",
      confirmLabel: "Stop sharing",
    });
    if (confirmed) share.stopSharing();
  };

  return (
    <Dialog onClose={onClose} size="md" portal>
      <ModalHeader title="Share Project" />
      <DialogBody className="grid grid-cols-1 gap-5 py-5">
        <div className="flex items-center gap-4">
          <span className="block size-20 shrink-0 overflow-hidden rounded-xl border border-primary-soft bg-pastel-pink-soft">
            {tile.thumbnail && (
              <PixelImage
                src={tile.thumbnail}
                alt=""
                className="size-full object-contain"
              />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {tile.name}
            </span>
            {tile.width && tile.height && (
              <span className="block text-[11px] text-muted-foreground tabular-nums">
                {tile.width} × {tile.height} px
              </span>
            )}
          </span>
        </div>

        {share.sharing && (
          <LinkAccessSection
            link={share.sharing.link}
            resetting={share.resetting}
            onAccessChange={share.setLink}
            onReset={share.resetLink}
          />
        )}

        {(share.error ?? share.loadError) && (
          <FormMessage tone="error">
            {share.error ?? share.loadError}
          </FormMessage>
        )}
      </DialogBody>
      <DialogFooter className={cn(MODAL_FOOTER, "items-center")}>
        {shared && (
          <button
            type="button"
            onClick={() => void stop()}
            className="mr-auto cursor-pointer text-xs text-destructive transition-colors hover:underline"
          >
            Stop sharing
          </button>
        )}
        <ModalButton variant="secondary" onClick={onClose}>
          Close
        </ModalButton>
      </DialogFooter>
    </Dialog>
  );
}
