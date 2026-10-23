"use client";

import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Input, Textarea } from "@pigxel/ui/components/input";
import { FilterSwitch } from "@/features/tiles/components/projects-view/components/project-filters-menu";
import type { ProductionPack } from "../../../../types";
import { useProductionActions } from "../../../../use-asset-review";
import { errorText } from "../../helpers";
import { SwatchPicker } from "../swatch-picker";

const LABEL = "mb-1.5 block text-xs font-semibold";

/** A pack's name, description, colour, pin and premium. Keyed by pack id. */
export function PackSettings({
  pack,
  count,
}: {
  pack: ProductionPack;
  count: number;
}) {
  const { updatePack, deletePack } = useProductionActions();
  const [name, setName] = useState(pack.name);
  const [description, setDescription] = useState(pack.description ?? "");
  const [premium, setPremium] = useState(pack.premium);
  const [pinned, setPinned] = useState(pack.pinned);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>();

  const dirty =
    name.trim() !== pack.name ||
    description.trim() !== (pack.description ?? "") ||
    premium !== pack.premium ||
    pinned !== pack.pinned;

  const run = async (action: () => Promise<unknown>, done: string) => {
    setPending(true);
    setStatus(undefined);
    try {
      await action();
      setStatus({ text: done });
    } catch (e) {
      setStatus({ error: true, text: errorText(e) });
    } finally {
      setPending(false);
    }
  };

  const save = () =>
    run(
      () =>
        updatePack(pack.id, {
          name,
          description,
          ...(premium !== pack.premium && { premium }),
          ...(pinned !== pack.pinned && { pinned }),
        }),
      "Saved.",
    );

  return (
    <section
      aria-label={`${pack.name} settings`}
      className="mb-6 rounded-xl border bg-card p-4"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
      >
        <div className="grid content-start gap-4">
          <label className="block">
            <span className={LABEL}>Name</span>
            <Input
              required
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm"
            />
          </label>
          <FilterSwitch
            label="Pinned: first on the Packs page, with a badge"
            on={pinned}
            onChange={setPinned}
          />
          <div className="grid gap-1.5">
            <FilterSwitch
              label="Premium: only paid plans can use it"
              on={premium}
              onChange={setPremium}
            />
            {premium !== pack.premium && (
              <p className="text-xs text-muted-foreground">
                Saving moves {count} .pigxel {count === 1 ? "file" : "files"}{" "}
                {premium ? "to the private bucket" : "to the public bucket"}.
              </p>
            )}
          </div>
        </div>
        <label className="block">
          <span className={LABEL}>Description</span>
          <Textarea
            rows={3}
            maxLength={400}
            placeholder="One or two short sentences about the pack."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none text-sm"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <span className="font-mono text-[11px] text-muted-foreground">
            {pack.id} · {count} {count === 1 ? "asset" : "assets"}
          </span>
          <span className="flex-1" />
          {status && (
            <span
              role="status"
              className={
                status.error
                  ? "text-xs text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {status.text}
            </span>
          )}
          <SwatchPicker
            value={pack.background}
            disabled={pending}
            onChange={(background) =>
              void run(() => updatePack(pack.id, { background }), "Saved.")
            }
          />
          {count === 0 && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => void run(() => deletePack(pack.id), "Deleted.")}
            >
              Delete pack
            </Button>
          )}
          <Button type="submit" disabled={pending || !dirty}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </section>
  );
}
