"use client";

import { useRouter } from "next/navigation";
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
import { updateArtDetails } from "../../../actions";
import { removeFromExplore } from "../../../remove-from-explore";
import { DESCRIPTION_MAX } from "../../../constants";
import { RemixToggle } from "../../explore-header/components/remix-toggle";
import { TagPicker } from "../../explore-header/components/tag-picker";

export function EditDetailsDialog({
  tileId,
  name,
  tags: initialTags,
  description: initialDescription,
  allowRemix: initialAllowRemix,
  onSaved,
  onClose,
}: {
  tileId: string;
  name: string;
  tags: string[];
  description: string | null;
  allowRemix: boolean;
  onSaved: (details: {
    name: string;
    tags: string[];
    description: string | null;
    allowRemix: boolean;
  }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(name);
  const [tags, setTags] = useState(initialTags);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [allowRemix, setAllowRemix] = useState(initialAllowRemix);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await updateArtDetails(
      tileId,
      tags,
      description,
      allowRemix,
      title,
    );
    setSaving(false);
    if (result.error) return setError(result.error);
    onSaved({
      name: title.trim(),
      tags,
      description: description.trim() || null,
      allowRemix,
    });
    if (title.trim() !== name) router.refresh();
    onClose();
  };

  const unpublish = async () => {
    setSaving(true);
    setError(null);
    const result = await removeFromExplore({ id: tileId, name });
    if (result.error) setError(result.error);
    if (result.removed) router.push("/tiles");
    else setSaving(false);
  };

  return (
    <Dialog onClose={onClose} size="md" portal>
      <DialogHeader
        title="Edit details"
        description="The name, tags and description show on this page."
      />
      <DialogBody className="grid gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">Name</span>
          <Input
            value={title}
            maxLength={100}
            required
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
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
        <RemixToggle value={allowRemix} onChange={setAllowRemix} />
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter className="items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          onClick={() => void unpublish()}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          Remove from Explore
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
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </span>
      </DialogFooter>
    </Dialog>
  );
}
