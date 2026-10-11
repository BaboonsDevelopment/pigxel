"use client";

import { IconButton } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { Input } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import type { Slice } from "@/lib/slices/slices";

export function SlicesDialog({
  slices,
  picked,
  onPick,
  onChange,
  onClose,
}: {
  slices: Slice[];
  picked: string | null;
  onPick: (id: string) => void;
  onChange: (slices: Slice[]) => void;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} size="md" portal>
      <DialogHeader
        title="Slices"
        description="Click a slice to pick it on the canvas. Type in its name to rename it."
      />
      <DialogBody>
        {slices.length ? (
          <ul className="-mx-2 grid gap-0.5">
            {slices.map((slice) => (
              <SliceRow
                key={slice.id}
                slice={slice}
                picked={slice.id === picked}
                onPick={() => onPick(slice.id)}
                onRename={(name) =>
                  onChange(
                    slices.map((s) => (s.id === slice.id ? { ...s, name } : s)),
                  )
                }
                onDelete={() =>
                  onChange(slices.filter((s) => s.id !== slice.id))
                }
              />
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No slices left.
          </p>
        )}
      </DialogBody>
    </Dialog>
  );
}

function SliceRow({
  slice,
  picked,
  onPick,
  onRename,
  onDelete,
}: {
  slice: Slice;
  picked: boolean;
  onPick: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const { close } = useDialog();
  const { bounds } = slice;
  const rename = (value: string) => {
    const name = value.trim().slice(0, 100);
    if (name && name !== slice.name) onRename(name);
  };
  const pick = () => {
    onPick();
    close();
  };
  return (
    <li
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("input, button")) pick();
      }}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5",
        picked ? "bg-secondary" : "hover:bg-secondary",
      )}
    >
      <Input
        key={slice.name}
        inputSize="sm"
        defaultValue={slice.name}
        aria-label={`Name of ${slice.name}`}
        onBlur={(e) => rename(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.preventDefault();
            e.currentTarget.value = slice.name;
            e.currentTarget.blur();
          }
        }}
        className="min-w-0 flex-1"
      />
      <button
        type="button"
        onClick={pick}
        className="rounded-md px-2 py-1 text-xs text-muted-foreground tabular-nums hover:bg-muted hover:text-foreground"
        title="Pick this slice"
      >
        {bounds.x}, {bounds.y} · {bounds.w} × {bounds.h}
      </button>
      <IconButton label={`Delete ${slice.name}`} onClick={onDelete}>
        ×
      </IconButton>
    </li>
  );
}
