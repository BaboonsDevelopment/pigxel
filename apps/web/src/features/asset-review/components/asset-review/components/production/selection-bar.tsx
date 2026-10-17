"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Input, Select } from "@pigxel/ui/components/input";
import type {
  ProductionAsset,
  ProductionPack,
  ProductionTag,
} from "../../../../types";
import { useProductionActions } from "../../../../use-asset-review";
import { errorText } from "../../helpers";

/** What can be done to the selected assets, all at once. */
export function SelectionBar({
  selected,
  packs,
  assets,
  tags,
  allShown,
  anyShown,
  onToggleAll,
  onClear,
}: {
  selected: string[];
  packs: ProductionPack[];
  assets: ProductionAsset[];
  tags: ProductionTag[];
  allShown: boolean;
  anyShown: boolean;
  onToggleAll: () => void;
  onClear: () => void;
}) {
  const { moveAssets, moveToFront, deleteAssets } = useProductionActions();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>();
  const count = selected.length;
  const chosen = assets.filter((a) => selected.includes(a.id));
  const premiumMoves = (packId: string) => {
    const premium = packs.find((p) => p.id === packId)?.premium;
    return chosen.filter((a) => a.packId !== packId && a.premium !== premium)
      .length;
  };

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
      setConfirming(false);
    }
  };

  const move = (packId: string) => {
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return;
    const files = premiumMoves(packId);
    if (
      files &&
      !window.confirm(
        `${pack.name} is ${pack.premium ? "premium" : "free"}: moving there also moves ${files} .pigxel ${files === 1 ? "file" : "files"} to the ${pack.premium ? "private" : "public"} bucket.`,
      )
    )
      return;
    void run(
      () => moveAssets(selected, packId),
      `Moved ${count} to ${pack.name}.`,
    );
  };

  return (
    <div className="sticky top-0 z-10 -mx-1 mb-4 flex min-h-12 flex-wrap items-center gap-2 rounded-xl border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
      <Button
        variant="ghost"
        size="sm"
        disabled={!anyShown}
        onClick={onToggleAll}
      >
        {allShown ? "Unselect shown" : "Select shown"}
      </Button>
      {count > 0 && (
        <>
          <span className="text-sm font-semibold">{count} selected</span>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <Select
            aria-label="Move to pack"
            value=""
            disabled={pending}
            onChange={(e) => move(e.target.value)}
          >
            <option value="" disabled>
              Move to…
            </option>
            {packs.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.name}
                {pack.premium ? " (premium)" : ""}
              </option>
            ))}
          </Select>
          <TagMenu selected={chosen} tags={tags} disabled={pending} />
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            title="Put them first in their pack, so they lead its collage"
            onClick={() =>
              void run(() => moveToFront(selected), "Moved to the front.")
            }
          >
            Show first
          </Button>
          {confirming ? (
            <span className="flex items-center gap-1">
              <span className="text-xs">Delete {count} everywhere?</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setConfirming(false)}
              >
                Keep
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() =>
                  void run(() => deleteAssets(selected), `Deleted ${count}.`)
                }
              >
                {pending ? "Deleting…" : "Delete"}
              </Button>
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setConfirming(true)}
              className="hover:text-destructive"
            >
              Delete
            </Button>
          )}
        </>
      )}
      {status && (
        <span
          role="status"
          className={
            status.error
              ? "ml-auto text-xs text-destructive"
              : "ml-auto text-xs text-muted-foreground"
          }
        >
          {status.text}
        </span>
      )}
    </div>
  );
}

/**
 * Tags on the selection: a tag all of them have is on, some is mixed. Clicking
 * puts it on all of them, or takes it off when all have it.
 */
function TagMenu({
  selected,
  tags,
  disabled,
}: {
  selected: ProductionAsset[];
  tags: ProductionTag[];
  disabled: boolean;
}) {
  const { tagAssets, createTag } = useProductionActions();
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const ids = selected.map((a) => a.id);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const run = async (action: () => Promise<unknown>) => {
    setPending(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPending(false);
    }
  };

  const add = () =>
    run(async () => {
      const tag = await createTag(newTag);
      await tagAssets(ids, [tag.id], []);
      setNewTag("");
    });

  return (
    <div ref={root} className="relative">
      <Button
        variant="secondary"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        Tags
      </Button>
      {open && (
        <div
          role="dialog"
          aria-label="Tags on the selected assets"
          className="absolute left-0 z-20 mt-2 grid w-72 gap-3 rounded-xl border bg-background p-3 shadow-lg"
        >
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const having = selected.filter((a) =>
                a.tags.includes(tag.id),
              ).length;
              const all = having === selected.length;
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={all ? true : having ? "mixed" : false}
                  disabled={pending}
                  onClick={() =>
                    void run(() =>
                      all
                        ? tagAssets(ids, [], [tag.id])
                        : tagAssets(ids, [tag.id], []),
                    )
                  }
                  className="h-7 cursor-pointer rounded-full border px-2.5 text-xs transition-colors hover:bg-muted disabled:opacity-60 aria-pressed:border-transparent aria-pressed:bg-pastel-pink aria-[pressed=mixed]:border-dashed aria-[pressed=mixed]:border-primary/50 aria-[pressed=mixed]:bg-transparent"
                >
                  {tag.name}
                  {having > 0 && !all && (
                    <span className="ml-1 text-muted-foreground">
                      {having}/{selected.length}
                    </span>
                  )}
                </button>
              );
            })}
            {!tags.length && (
              <span className="text-xs text-muted-foreground">
                No tags yet.
              </span>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newTag.trim()) void add();
            }}
            className="flex gap-2"
          >
            <Input
              aria-label="New tag"
              placeholder="New tag"
              maxLength={40}
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="h-8 text-xs"
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={pending}
            >
              Add
            </Button>
          </form>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
