"use client";

import { useState } from "react";
import { ModalButton } from "@/components/ui/modal-button";
import { CheckboxField } from "@pigxel/ui/components/choice";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { showSuccess } from "@/components/ui/snackbar";
import { deleteFolder } from "../../../actions";
import type { Folder } from "../../../folders";
import { PixelImage } from "@/components/ui/pixel-image";

export function DeleteFolderDialog({
  folder,
  onDeleted,
  onClose,
}: {
  folder: Folder;
  onDeleted: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <DeleteFolderForm folder={folder} onDeleted={onDeleted} />
    </Dialog>
  );
}

function DeleteFolderForm({
  folder,
  onDeleted,
}: {
  folder: Folder;
  onDeleted: () => void;
}) {
  const { close } = useDialog();
  const [withProjects, setWithProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    setDeleting(true);
    setError(null);
    const result = await deleteFolder(folder.id, withProjects);
    setDeleting(false);
    if (result.error) return setError(result.error);
    showSuccess("Folder deleted!");
    close();
    onDeleted();
  };

  return (
    <>
      <ModalHeader title="Delete Folder" className="bg-attention-soft" />
      <DialogBody className="grid gap-4 py-5">
        <div className="flex items-center gap-4">
          <PixelImage
            src="/art/new-folders-image.png"
            alt=""
            width={128}
            height={85}
            className="h-[85px] w-32 shrink-0"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {folder.name}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {folder.count === 1 ? "1 project" : `${folder.count} projects`}
            </span>
          </span>
        </div>
        <p className="text-sm">
          Are you sure you want to delete this folder? This action cannot be
          undone.
        </p>
        <CheckboxField
          label="Also delete projects inside"
          checked={withProjects}
          disabled={folder.count === 0}
          onChange={(e) => setWithProjects(e.target.checked)}
        />
        {withProjects && (
          <p className="-mt-2 text-xs text-muted-foreground">
            They’re deleted for good, with their versions, likes and comments.
          </p>
        )}
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton type="button" variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton
          type="button"
          disabled={deleting}
          onClick={() => void remove()}
        >
          {deleting ? "Deleting…" : "Delete"}
        </ModalButton>
      </DialogFooter>
    </>
  );
}
