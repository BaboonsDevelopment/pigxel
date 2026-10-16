"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { Input, Textarea } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { FilterSwitch } from "@/features/tiles/components/projects-view/components/project-filters-menu";
import { setPackPremium, updatePack } from "../admin-actions";
import { ASSET_BACKGROUNDS } from "../constants";
import type { PackCard as Pack } from "../server";

const LABEL = "mb-2 block text-sm font-semibold";

/** Admins edit a pack: its name, description, colour and premium. */
export function PackEditDialog({
  pack,
  onClose,
}: {
  pack: Pack;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} size="md" portal>
      <PackEditForm pack={pack} />
    </Dialog>
  );
}

function PackEditForm({ pack }: { pack: Pack }) {
  const { close } = useDialog();
  const [name, setName] = useState(pack.name);
  const [description, setDescription] = useState(pack.description ?? "");
  const [background, setBackground] = useState(pack.background);
  const [premium, setPremium] = useState(pack.premium);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const saved = await updatePack(pack.id, { name, description, background });
    if (saved.error) {
      setBusy(false);
      return setError(saved.error);
    }
    if (premium !== pack.premium) {
      const switched = await setPackPremium(pack.id, premium);
      if (switched.error) {
        setBusy(false);
        return setError(switched.error);
      }
    }
    close();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex min-h-0 flex-col"
    >
      <ModalHeader title="Edit Pack" />
      <DialogBody className="grid gap-5 py-5">
        <label className="block">
          <span className={LABEL}>Name</span>
          <Input
            required
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl px-4"
          />
        </label>
        <label className="block">
          <span className={LABEL}>Description</span>
          <Textarea
            rows={3}
            maxLength={400}
            placeholder="One or two short sentences about the pack."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none rounded-xl px-4 py-3"
          />
        </label>
        <fieldset>
          <legend className={LABEL}>Background</legend>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={background === null}
              onClick={() => setBackground(null)}
              className="h-7 rounded-md border px-2 text-xs aria-pressed:ring-2 aria-pressed:ring-primary"
            >
              Default
            </button>
            {ASSET_BACKGROUNDS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                aria-pressed={background === color}
                onClick={() => setBackground(color)}
                className={cn(
                  "size-7 rounded-md border border-black/10 aria-pressed:ring-2 aria-pressed:ring-primary aria-pressed:ring-offset-1",
                )}
                style={{ background: color }}
              />
            ))}
          </div>
        </fieldset>
        <div className="grid gap-1.5">
          <FilterSwitch
            label="Premium: only paid plans can use it"
            on={premium}
            onChange={setPremium}
          />
          {premium !== pack.premium && (
            <p className="text-xs text-muted-foreground">
              Saving moves {pack.count} .pigxel{" "}
              {pack.count === 1 ? "file" : "files"}{" "}
              {premium ? "to the private bucket" : "back to the public bucket"}.
              This can take a few seconds.
            </p>
          )}
        </div>
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
