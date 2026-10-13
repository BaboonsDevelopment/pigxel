"use client";

import { useState } from "react";
import { Dialog, DialogBody, DialogFooter } from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { Input, Textarea } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { updateCollection } from "../actions";
import type { Collection } from "../collections";
import { COLLECTION_DESCRIPTION_MAX, COLLECTION_NAME_MAX } from "../constants";
import { showSuccess } from "@/components/ui/snackbar";

const LABEL = "mb-2 block text-sm font-semibold";

export function CollectionDialog({
  collection,
  onDelete,
  onClose,
}: {
  collection: Collection;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await updateCollection(collection.id, name, description);
    setSaving(false);
    if (result.error) return setError(result.error);
    showSuccess("Collection updated!");
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
        <ModalHeader title="Edit Collection" />
        <DialogBody className="grid gap-5 py-5">
          <p className="-mb-1 text-sm text-muted-foreground">
            Everyone who opens the collection sees its name and description.
          </p>
          <label className="block">
            <span className={LABEL}>Name</span>
            <Input
              value={name}
              maxLength={COLLECTION_NAME_MAX}
              required
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl px-4 text-base"
            />
          </label>
          <label className="block">
            <span className={cn(LABEL, "flex justify-between")}>
              Description
              <span className="font-normal text-muted-foreground tabular-nums">
                {description.length}/{COLLECTION_DESCRIPTION_MAX}
              </span>
            </span>
            <Textarea
              rows={3}
              maxLength={COLLECTION_DESCRIPTION_MAX}
              placeholder="What ties these arts together?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl px-4 py-3"
            />
          </label>
          {error && <FormMessage tone="error">{error}</FormMessage>}
        </DialogBody>
        <DialogFooter className={cn(MODAL_FOOTER, "items-center")}>
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="mr-auto text-xs text-destructive transition-colors hover:underline disabled:opacity-50"
          >
            Delete collection
          </button>
          <ModalButton variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton type="submit" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save"}
          </ModalButton>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
