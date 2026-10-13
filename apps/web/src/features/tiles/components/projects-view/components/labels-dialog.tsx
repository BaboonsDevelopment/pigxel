"use client";

import { useState } from "react";
import { Dialog, DialogBody, DialogFooter } from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { createLabel, deleteLabel, setTileLabels } from "../../../actions";
import { LABEL_COLORS, LABEL_NAME_MAX, type Label } from "../../../labels";

export function LabelsDialog({
  tile,
  labels,
  onLabelsChange,
  onSaved,
  onClose,
}: {
  tile: { id: string; name: string; labels?: string[] };
  labels: Label[];
  onLabelsChange: (labels: Label[]) => void;
  onSaved: (labelIds: string[]) => void;
  onClose: () => void;
}) {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(
    new Set(tile.labels ?? []),
  );
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(LABEL_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) =>
    setChosen((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const add = async (): Promise<Label | null> => {
    if (!name.trim()) return null;
    setBusy(true);
    setError(null);
    const result = await createLabel(name, color);
    setBusy(false);
    if (!result.label) {
      setError(result.error ?? "Couldn’t create the label.");
      return null;
    }
    const created = result.label;
    onLabelsChange(
      [...labels, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setChosen((ids) => new Set(ids).add(created.id));
    setName("");
    setColor(
      LABEL_COLORS[(labels.length + 1) % LABEL_COLORS.length] ??
        LABEL_COLORS[0],
    );
    return created;
  };

  const remove = async (label: Label) => {
    const confirmed = await confirmDialog({
      title: `Delete the “${label.name}” label?`,
      message: "It comes off every project. The projects stay.",
      confirmLabel: "Delete",
    });
    if (!confirmed) return;
    setError(null);
    const result = await deleteLabel(label.id);
    if (result.error) return setError(result.error);
    onLabelsChange(labels.filter((l) => l.id !== label.id));
    setChosen((ids) => {
      const next = new Set(ids);
      next.delete(label.id);
      return next;
    });
  };

  const save = async () => {
    const typed = name.trim() ? await add() : null;
    if (name.trim() && !typed) return;
    setBusy(true);
    setError(null);
    const ids = [
      ...labels.filter((l) => chosen.has(l.id)).map((l) => l.id),
      ...(typed ? [typed.id] : []),
    ];
    const result = await setTileLabels(tile.id, ids);
    setBusy(false);
    if (result.error) return setError(result.error);
    onSaved(ids);
    onClose();
  };

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <ModalHeader title="Labels" />
      <DialogBody className="grid gap-5 py-5">
        <p className="-mb-1 text-sm text-muted-foreground">
          Only you see labels. Use them to sort “{tile.name}” and find it with
          Filters.
        </p>
        {labels.length > 0 ? (
          <ul className="grid max-h-64 gap-1 overflow-y-auto rounded-xl border bg-pink-base p-2">
            {labels.map((label) => (
              <li key={label.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={chosen.has(label.id)}
                  onClick={() => toggle(label.id)}
                  className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors hover:bg-background"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border bg-background",
                      chosen.has(label.id) &&
                        "border-pink-strong bg-pink-strong text-white",
                    )}
                  >
                    {chosen.has(label.id) && (
                      <svg viewBox="0 0 12 12" className="size-3">
                        <path
                          d="m2.5 6.2 2.3 2.3 4.7-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: label.color }}
                  />
                  <span className="truncate">{label.name}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete the ${label.name} label`}
                  onClick={() => void remove(label)}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-background hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5"
                  >
                    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border bg-pink-base px-4 py-5 text-center text-sm text-muted-foreground">
            No labels yet. Make one below, like “Client work” or “Ideas”.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void add();
          }}
          className="grid gap-2"
        >
          <span className="text-sm font-semibold">New label</span>
          <div className="flex gap-2">
            <Input
              aria-label="Label name"
              placeholder="Ideas"
              maxLength={LABEL_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl px-4 text-base"
            />
            <ModalButton
              type="submit"
              variant="secondary"
              disabled={busy || !name.trim()}
            >
              Add
            </ModalButton>
          </div>
          <div
            role="radiogroup"
            aria-label="Label color"
            className="mt-1 flex gap-2"
          >
            {LABEL_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                role="radio"
                aria-checked={color === swatch}
                aria-label={swatch}
                onClick={() => setColor(swatch)}
                className={cn(
                  "size-7 cursor-pointer rounded-full ring-1 ring-black/10 transition-transform hover:scale-110",
                  color === swatch && "ring-2 ring-pink-strong ring-offset-2",
                )}
                style={{ background: swatch }}
              />
            ))}
          </div>
        </form>
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={onClose}>
          Cancel
        </ModalButton>
        <ModalButton disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save"}
        </ModalButton>
      </DialogFooter>
    </Dialog>
  );
}
