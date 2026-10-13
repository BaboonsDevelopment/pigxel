"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import type { FrameTag, TagDirection } from "@/lib/sprite/tags";
import { SIZE_LABEL, SizeField } from "../../components/size-controls";

const DIRECTIONS: { value: TagDirection; label: string }[] = [
  { value: "forward", label: "Forward" },
  { value: "reverse", label: "Reverse" },
  { value: "pingpong", label: "Ping-pong" },
];

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
  const [hex, setHex] = useState(tag?.color ?? "#3b82f6");
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
      <ModalHeader title={tag ? "Edit Frame Tag" : "New Frame Tag"} />
      <DialogBody className="py-5">
        <form
          id="frame-tag-form"
          className="grid gap-5"
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
          <div>
            <label className="block">
              <span className={SIZE_LABEL}>Name</span>
              <Input
                autoFocus
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl px-4 text-base"
              />
            </label>
            {duplicate && (
              <FormMessage tone="error" className="mt-2">
                Tag names must be unique.
              </FormMessage>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SizeField
              id="tag-from"
              label="From frame"
              unit=""
              value={from}
              onChange={setFrom}
            />
            <SizeField
              id="tag-to"
              label="To frame"
              unit=""
              value={to}
              onChange={setTo}
            />
          </div>
          <div>
            <span className={SIZE_LABEL}>Colour</span>
            <div className="flex items-center gap-2">
              <label
                title="Pick a colour"
                className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-xl ring-1 ring-black/10"
              >
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: color }}
                />
                <input
                  type="color"
                  aria-label="Tag colour"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setHex(e.target.value);
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <Input
                aria-label="Hex colour"
                value={hex}
                maxLength={7}
                onChange={(e) => {
                  const next = e.target.value.trim();
                  setHex(next);
                  if (/^#[0-9a-f]{6}$/i.test(next))
                    setColor(next.toLowerCase());
                }}
                className="h-10 w-full rounded-xl px-3 font-mono uppercase"
              />
            </div>
          </div>
          <fieldset>
            <legend className={SIZE_LABEL}>Direction</legend>
            <div role="radiogroup" className="grid grid-cols-3 gap-2">
              {DIRECTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={direction === value}
                  onClick={() => setDirection(value)}
                  className={cn(
                    "h-11 rounded-xl border px-3 text-sm transition-colors",
                    direction === value
                      ? "border-primary-soft bg-pastel-pink-soft font-semibold"
                      : "bg-background hover:bg-pink-base",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <SizeField
              id="tag-repeat"
              label="Repeats"
              unit="times"
              min={0}
              value={repeat}
              onChange={setRepeat}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              0 plays it on a loop forever.
            </p>
          </div>
        </form>
      </DialogBody>
      <DialogFooter className={cn(MODAL_FOOTER, "items-center")}>
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
    <>
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="mr-auto text-xs text-destructive transition-colors hover:underline"
        >
          Delete tag
        </button>
      )}
      <ModalButton variant="secondary" onClick={close}>
        Cancel
      </ModalButton>
      <ModalButton type="submit" form="frame-tag-form" disabled={!canSave}>
        Save
      </ModalButton>
    </>
  );
}
