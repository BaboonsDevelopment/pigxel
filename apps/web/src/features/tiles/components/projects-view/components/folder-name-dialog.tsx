"use client";

import { useState } from "react";
import { ModalButton } from "@/components/ui/modal-button";
import { Dialog, DialogBody, DialogFooter } from "@pigxel/ui/components/dialog";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { showSuccess } from "@/components/ui/snackbar";
import { createFolder, renameFolder } from "../../../actions";
import { FOLDER_NAME_MAX } from "../../../folders";
import { PixelImage } from "@/components/ui/pixel-image";

export function FolderNameDialog({
  folder,
  onClose,
}: {
  folder?: { id: string; name: string };
  onClose: () => void;
}) {
  const [name, setName] = useState(folder?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = folder
      ? await renameFolder(folder.id, name)
      : await createFolder(name);
    setSaving(false);
    if (result.error) return setError(result.error);
    showSuccess(folder ? "Folder renamed!" : "Folder created!");
    onClose();
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
        <ModalHeader title={folder ? "Rename Folder" : "Create New Folder"} />
        <DialogBody className="grid gap-5 py-5">
          <div className="flex items-center gap-6">
            <PixelImage
              src="/art/new-folders-image.png"
              alt=""
              width={128}
              height={85}
              className="h-[85px] w-32 shrink-0"
            />
            <p className="text-sm text-muted-foreground">
              A cozy place to keep your pixels together.
            </p>
          </div>
          <Field label="Folder name" htmlFor="folder-name">
            <Input
              id="folder-name"
              autoFocus
              placeholder="Little worlds"
              maxLength={FOLDER_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            {saving ? "Saving…" : folder ? "Rename" : "Create"}
          </ModalButton>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
