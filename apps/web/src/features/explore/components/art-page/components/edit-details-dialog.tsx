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
import { Textarea } from "@pigxel/ui/components/input";
import { updateArtDetails } from "../../../actions";
import { DESCRIPTION_MAX } from "../../../constants";
import { TagPicker } from "../../explore-header/components/tag-picker";

export function EditDetailsDialog({
  tileId,
  tags: initialTags,
  description: initialDescription,
  onSaved,
  onClose,
}: {
  tileId: string;
  tags: string[];
  description: string | null;
  onSaved: (details: { tags: string[]; description: string | null }) => void;
  onClose: () => void;
}) {
  const [tags, setTags] = useState(initialTags);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await updateArtDetails(tileId, tags, description);
    setSaving(false);
    if (result.error) return setError(result.error);
    onSaved({ tags, description: description.trim() || null });
    onClose();
  };

  return (
    <Dialog onClose={onClose} size="md" portal>
      <DialogHeader
        title="Edit details"
        description="Tags help people find it. The description shows on this page."
      />
      <DialogBody className="grid gap-4">
        <div>
          <span className="mb-1.5 block text-xs font-medium">Tags</span>
          <TagPicker value={tags} onChange={setTags} />
        </div>
        <label className="block">
          <span className="mb-1.5 flex justify-between text-xs font-medium">
            Description
            <span className="font-normal text-muted-foreground tabular-nums">
              {description.length}/{DESCRIPTION_MAX}
            </span>
          </span>
          <Textarea
            rows={5}
            maxLength={DESCRIPTION_MAX}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter>
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
