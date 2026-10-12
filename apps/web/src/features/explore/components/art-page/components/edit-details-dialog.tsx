"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogBody, DialogFooter } from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { Input, Textarea } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { PixelImage } from "@/components/ui/pixel-image";
import { updateArtDetails } from "../../../actions";
import { removeFromExplore } from "../../../remove-from-explore";
import { DESCRIPTION_MAX } from "../../../constants";
import { RemixToggle } from "../../explore-header/components/remix-toggle";
import { TagPicker } from "../../explore-header/components/tag-picker";
import { showSuccess } from "@/components/ui/snackbar";

const LABEL = "mb-2 block text-sm font-semibold";

export function EditDetailsDialog({
  tileId,
  thumbnail,
  width,
  height,
  name,
  tags: initialTags,
  description: initialDescription,
  allowRemix: initialAllowRemix,
  onSaved,
  onClose,
}: {
  tileId: string;
  thumbnail: string | null;
  width: number;
  height: number;
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
    showSuccess("Details saved!");
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
    const result = await removeFromExplore({
      id: tileId,
      name,
      thumbnail,
      width,
      height,
    });
    if (result.error) setError(result.error);
    if (result.removed) router.push("/tiles");
    else setSaving(false);
  };

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <ModalHeader title="Edit Publication" />
      <DialogBody className="grid gap-5 py-5">
        <div className="flex items-center gap-4">
          <span className="block size-20 shrink-0 overflow-hidden rounded-xl border border-primary-soft bg-pastel-pink-soft">
            {thumbnail && (
              <PixelImage
                src={thumbnail}
                alt=""
                className="size-full object-contain"
              />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {title.trim() || name}
            </span>
            <span className="block text-[11px] text-muted-foreground tabular-nums">
              {width} × {height} px
            </span>
          </span>
        </div>
        <label className="block">
          <span className={LABEL}>Title</span>
          <Input
            value={title}
            maxLength={100}
            required
            onChange={(e) => setTitle(e.target.value)}
            className="h-12 rounded-xl px-4"
          />
        </label>
        <label className="block">
          <span className={cn(LABEL, "flex justify-between")}>
            Description
            <span className="font-normal text-muted-foreground tabular-nums">
              {description.length}/{DESCRIPTION_MAX}
            </span>
          </span>
          <Textarea
            rows={3}
            maxLength={DESCRIPTION_MAX}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl px-4 py-3"
          />
        </label>
        <div>
          <span className={LABEL}>Tags</span>
          <TagPicker
            value={tags}
            onChange={setTags}
            className="min-h-12 rounded-xl px-4"
          />
        </div>
        <RemixToggle value={allowRemix} onChange={setAllowRemix} />
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter className={cn(MODAL_FOOTER, "items-center")}>
        <button
          type="button"
          disabled={saving}
          onClick={() => void unpublish()}
          className="mr-auto text-xs text-destructive transition-colors hover:underline disabled:opacity-50"
        >
          Unpublish
        </button>
        <ModalButton variant="secondary" disabled={saving} onClick={onClose}>
          Cancel
        </ModalButton>
        <ModalButton disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save Changes"}
        </ModalButton>
      </DialogFooter>
    </Dialog>
  );
}
