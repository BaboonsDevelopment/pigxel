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
import { Input, Textarea } from "@pigxel/ui/components/input";
import { updateCollection } from "../actions";
import type { Collection } from "../collections";
import { COLLECTION_DESCRIPTION_MAX, COLLECTION_NAME_MAX } from "../constants";

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
    if (result.error) setError(result.error);
    else onClose();
  };

  return (
    <Dialog onClose={onClose} size="md" portal>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <DialogHeader
          title="Edit collection"
          description="Everyone who opens the collection sees its name and description."
        />
        <DialogBody className="grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">Name</span>
            <Input
              value={name}
              maxLength={COLLECTION_NAME_MAX}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex justify-between text-xs font-medium">
              Description
              <span className="font-normal text-muted-foreground tabular-nums">
                {description.length}/{COLLECTION_DESCRIPTION_MAX}
              </span>
            </span>
            <Textarea
              rows={4}
              maxLength={COLLECTION_DESCRIPTION_MAX}
              placeholder="What ties these arts together?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {error && <FormMessage tone="error">{error}</FormMessage>}
        </DialogBody>
        <DialogFooter className="items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={onDelete}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Delete collection
          </Button>
          <span className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </span>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
