"use client";

import { IconButton } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
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
      <ModalHeader title="Slices" />
      <DialogBody className="py-5">
        {slices.length ? (
          <ul className="grid max-h-96 gap-1 overflow-y-auto rounded-xl border bg-background p-2">
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
          <p className="rounded-xl border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
            No slices left.
          </p>
        )}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <CloseButton />
      </DialogFooter>
    </Dialog>
  );
}

function CloseButton() {
  const { close } = useDialog();
  return (
    <ModalButton variant="secondary" onClick={close}>
      Close
    </ModalButton>
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
        picked ? "bg-pastel-pink-soft" : "hover:bg-muted/60",
      )}
    >
      <Input
        key={slice.name}
        inputSize="md"
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
        className="min-w-0 flex-1 rounded-xl px-3"
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
