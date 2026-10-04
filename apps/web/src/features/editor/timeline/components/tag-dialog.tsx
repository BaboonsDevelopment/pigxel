"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  useDialog,
} from "@pigxel/ui/components/dialog";
import type { FrameTag, TagDirection } from "@/lib/sprite/tags";
import { EditorSelect } from "../../components/editor-select";

export function TagDialog({
  tag,
  tags,
  frameCount,
  initialFrame,
  onSave,
  onDelete,
  onClose,
}: {
  tag?: FrameTag;
  tags: FrameTag[];
  frameCount: number;
  initialFrame: number;
  onSave: (tag: FrameTag) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(tag?.name ?? "");
  const [from, setFrom] = useState(String((tag?.from ?? initialFrame) + 1));
  const [to, setTo] = useState(String((tag?.to ?? initialFrame) + 1));
  const [color, setColor] = useState(tag?.color ?? "#3b82f6");
  const [direction, setDirection] = useState<TagDirection>(
    tag?.direction ?? "forward",
  );
  const [repeat, setRepeat] = useState(String(tag?.repeat ?? 0));
  const fromNumber = Number(from);
  const toNumber = Number(to);
  const repeatNumber = Number(repeat);
  const duplicate = tags.some(
    (other) =>
      other.id !== tag?.id &&
      other.name.toLowerCase() === name.trim().toLowerCase(),
  );
  const valid =
    name.trim().length > 0 &&
    !duplicate &&
    from !== "" &&
    to !== "" &&
    repeat !== "" &&
    Number.isInteger(fromNumber) &&
    Number.isInteger(toNumber) &&
    fromNumber >= 1 &&
    toNumber >= fromNumber &&
    toNumber <= frameCount &&
    Number.isInteger(repeatNumber) &&
    repeatNumber >= 0 &&
    repeatNumber <= 1000;
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <DialogHeader title={tag ? "Edit frame tag" : "New frame tag"} />
      <DialogBody>
        <form
          id="frame-tag-form"
          className="space-y-4 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            onSave({
              id: tag?.id ?? crypto.randomUUID(),
              name: name.trim(),
              from: fromNumber - 1,
              to: toNumber - 1,
              color,
              direction,
              repeat: repeatNumber,
            });
            (e.currentTarget.closest("dialog") as HTMLDialogElement).close();
          }}
        >
          <label className="block">
            <span className="mb-1 block">Name</span>
            <input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2"
            />
          </label>
          {duplicate && (
            <p className="text-destructive">Tag names must be unique.</p>
          )}
          <div className="flex gap-3">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block">From frame</span>
              <input
                type="number"
                min={1}
                max={frameCount}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2"
              />
            </label>
            <label className="min-w-0 flex-1">
              <span className="mb-1 block">To frame</span>
              <input
                type="number"
                min={1}
                max={frameCount}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2"
              />
            </label>
          </div>
          <label className="flex items-center gap-3">
            <span>Color</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-12 cursor-pointer"
            />
          </label>
          <label className="block">
            <span className="mb-1 block">Direction</span>
            <EditorSelect
              value={direction}
              onChange={(value) => setDirection(value as TagDirection)}
              className="h-9 w-full rounded-md border bg-background px-2"
              options={[
                { value: "forward", label: "Forward" },
                { value: "reverse", label: "Reverse" },
                { value: "pingpong", label: "Ping-pong" },
              ]}
            />
          </label>
          <label className="block">
            <span className="mb-1 block">Repeats (0 = infinite)</span>
            <input
              type="number"
              min={0}
              max={1000}
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2"
            />
          </label>
        </form>
      </DialogBody>
      <DialogFooter>
        <TagDialogButtons
          canSave={valid}
          canDelete={!!tag}
          onDelete={() => {
            onDelete();
            onClose();
          }}
        />
      </DialogFooter>
    </Dialog>
  );
}

function TagDialogButtons({
  canSave,
  canDelete,
  onDelete,
}: {
  canSave: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const { close } = useDialog();
  return (
    <div className="flex w-full gap-2">
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="mr-auto rounded-md border px-3 py-1.5 text-sm text-destructive"
        >
          Delete
        </button>
      )}
      <button
        type="button"
        onClick={close}
        className="rounded-md border px-3 py-1.5 text-sm"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="frame-tag-form"
        disabled={!canSave}
        className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-40"
      >
        Save
      </button>
    </div>
  );
}
