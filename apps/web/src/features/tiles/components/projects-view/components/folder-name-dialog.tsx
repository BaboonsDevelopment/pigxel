"use client";

import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { createFolder, renameFolder } from "../../../actions";
import { FOLDER_NAME_MAX } from "../../../folders";

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
    if (result.error) setError(result.error);
    else onClose();
  };

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <DialogHeader title={folder ? "Rename folder" : "New folder"} />
        <DialogBody>
          <Input
            autoFocus
            aria-label="Folder name"
            placeholder="Characters"
            maxLength={FOLDER_NAME_MAX}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && (
            <FormMessage tone="error" className="mt-2">
              {error}
            </FormMessage>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : folder ? "Rename" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
