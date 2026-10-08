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
import { Input } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { confirmDialog } from "@/components/ui/confirm-dialog";
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
      <DialogHeader
        title="Labels"
        description={`Only you see labels. Use them to sort “${tile.name}” and find it with Filters.`}
      />
      <DialogBody className="grid gap-4">
        {labels.length > 0 ? (
          <ul className="grid gap-0.5">
            {labels.map((label) => (
              <li key={label.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={chosen.has(label.id)}
                  onClick={() => toggle(label.id)}
                  className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors hover:bg-secondary"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                      chosen.has(label.id) &&
                        "border-primary bg-primary text-primary-foreground",
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
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: label.color }}
                  />
                  <span className="truncate">{label.name}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete the ${label.name} label`}
                  onClick={() => void remove(label)}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
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
          <p className="text-sm text-muted-foreground">
            No labels yet. Make one below, like “Client work” or “Ideas”.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void add();
          }}
          className="grid gap-2 border-t pt-4"
        >
          <span className="text-xs font-medium">New label</span>
          <div className="flex gap-2">
            <Input
              aria-label="Label name"
              placeholder="Ideas"
              maxLength={LABEL_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={busy || !name.trim()}
            >
              Add
            </Button>
          </div>
          <div
            role="radiogroup"
            aria-label="Label color"
            className="flex gap-1.5"
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
                  "size-6 cursor-pointer rounded-full border border-black/5 transition-transform hover:scale-110",
                  color === swatch && "ring-2 ring-primary ring-offset-2",
                )}
                style={{ background: swatch }}
              />
            ))}
          </div>
        </form>
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
