"use client";

import { Dialog, DialogBody, DialogFooter } from "@pigxel/ui/components/dialog";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";

export function ConflictDialog({
  name,
  busy,
  onKeepMine,
  onTakeTheirs,
}: {
  name: string;
  busy: boolean;
  onKeepMine: () => void;
  onTakeTheirs: () => void;
}) {
  return (
    <Dialog onClose={() => {}} dismissible={false} size="sm" portal>
      <ModalHeader
        title="Version Conflict"
        className="bg-attention-soft"
        closable={false}
      />
      <DialogBody className="grid gap-4 py-5 text-sm">
        <p>
          “{name}” was changed on another device or tab since you opened it
          here. Which version do you want to keep?
        </p>
        <ul className="grid gap-2 rounded-xl border p-4 text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">
              Keep this version
            </span>{" "}
            saves what you see here over the other changes.
          </li>
          <li>
            <span className="font-semibold text-foreground">
              Use the other version
            </span>{" "}
            opens the newer copy from Pigxel cloud. Your changes here are
            dropped.
          </li>
        </ul>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" disabled={busy} onClick={onTakeTheirs}>
          Use the other version
        </ModalButton>
        <ModalButton disabled={busy} onClick={onKeepMine}>
          Keep this version
        </ModalButton>
      </DialogFooter>
    </Dialog>
  );
}
