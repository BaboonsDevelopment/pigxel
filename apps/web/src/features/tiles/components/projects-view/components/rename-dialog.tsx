"use client";

import { useState } from "react";
import { ModalButton } from "@/components/ui/modal-button";
import { Dialog, DialogBody, DialogFooter } from "@pigxel/ui/components/dialog";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { PROJECT_NAME_MAX } from "../../../constants";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";

export function RenameDialog({
  name: current,
  onRename,
  onClose,
}: {
  name: string;
  onRename: (name: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [name, setName] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const unchanged = name.trim() === current;

  const save = async () => {
    if (unchanged) return onClose();
    setSaving(true);
    setError(null);
    const failed = await onRename(name.trim());
    setSaving(false);
    if (failed) setError(failed);
    else onClose();
  };

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex min-h-0 flex-col"
      >
        <ModalHeader title="Rename Project" />
        <DialogBody className="grid gap-5 py-5">
          <Field label="New name" htmlFor="rename-project">
            <Input
              id="rename-project"
              autoFocus
              maxLength={PROJECT_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 rounded-xl px-4 text-base"
            />
          </Field>
          {error && <FormMessage tone="error">{error}</FormMessage>}
        </DialogBody>
        <DialogFooter className={MODAL_FOOTER}>
          <ModalButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton type="submit" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Rename"}
          </ModalButton>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
