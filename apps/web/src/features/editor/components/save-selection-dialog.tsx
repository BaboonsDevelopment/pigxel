"use client";

import { useState } from "react";
import { Dialog, DialogBody, DialogFooter } from "@pigxel/ui/components/dialog";
import { Field } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { MAX_SELECTION_NAME } from "@/lib/selections/saved";

export default function SaveSelectionDialog({
  defaultName,
  onSave,
  onClose,
}: {
  defaultName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const trimmed = name.trim();

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <form
        className="flex min-h-0 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed) return;
          onSave(trimmed);
          onClose();
        }}
      >
        <ModalHeader title="Save Selection" />
        <DialogBody className="grid gap-5 py-5">
          <Field label="Name" htmlFor="selection-name">
            <Input
              id="selection-name"
              autoFocus
              value={name}
              maxLength={MAX_SELECTION_NAME}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 rounded-xl px-4 text-base"
            />
          </Field>
        </DialogBody>
        <DialogFooter className={MODAL_FOOTER}>
          <ModalButton variant="secondary" onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton type="submit" disabled={!trimmed}>
            Save
          </ModalButton>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
