"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@pigxel/ui/lib/utils";
import {
  createCollection,
  loadMyCollections,
  setInCollection,
} from "../actions";
import type { MyCollection } from "../collections";
import { COLLECTION_NAME_MAX } from "../constants";
import { showSuccess } from "@/components/ui/snackbar";
import { modalButton } from "@/components/ui/modal-button";
import { madimiOne } from "@/lib/fonts/madimi";

const PANEL_WIDTH = 288;
const GUTTER = 8;

export function CollectButton({
  tileId,
  signedIn,
}: {
  tileId: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<MyCollection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(
    null,
  );
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !panel.current?.contains(target))
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const hide = (event: Event) => {
      if (!panel.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open]);

  const toggleOpen = async () => {
    if (!signedIn) return router.push("/login");
    const next = !open;
    const rect = root.current?.getBoundingClientRect();
    if (rect)
      setPlace({
        top: rect.bottom + 4,
        left: Math.max(
          GUTTER,
          Math.min(rect.left, window.innerWidth - PANEL_WIDTH - GUTTER),
        ),
      });
    setOpen(next);
    setError(null);
    setName(null);
    if (!next) return;
    const mine = await loadMyCollections(tileId);
    if (mine) {
      setCollections(mine);
      setChosen(new Set(mine.filter((c) => c.has).map((c) => c.id)));
    } else setError("Couldn’t load your collections. Try again.");
  };

  const toggle = (collection: MyCollection) =>
    setChosen((ids) => {
      const next = new Set(ids);
      if (!next.delete(collection.id)) next.add(collection.id);
      return next;
    });

  const changed = (collections ?? []).filter((c) => chosen.has(c.id) !== c.has);

  const save = async () => {
    if (!changed.length || saving) return;
    setSaving(true);
    setError(null);
    const results = await Promise.all(
      changed.map((c) => setInCollection(c.id, tileId, chosen.has(c.id))),
    );
    setSaving(false);
    const failed = results.find((result) => result.error);
    if (failed) return setError(failed.error ?? "Couldn’t save that.");
    setCollections(
      (all) =>
        all?.map((c) =>
          chosen.has(c.id) === c.has
            ? c
            : {
                ...c,
                has: chosen.has(c.id),
                count: c.count + (chosen.has(c.id) ? 1 : -1),
              },
        ) ?? null,
    );
    showSuccess("Collections updated!");
    setOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const create = async () => {
    if (!name?.trim() || creating) return;
    setCreating(true);
    setError(null);
    const result = await createCollection(name);
    setCreating(false);
    if (!result.collection)
      return setError(result.error ?? "Couldn’t create the collection.");
    const created = result.collection;
    setCollections((all) => [created, ...(all ?? [])]);
    setChosen((ids) => new Set(ids).add(created.id));
    setName(null);
    showSuccess("Collection created!");
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => void toggleOpen()}
        className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-xs transition-colors hover:bg-muted"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <rect x="2" y="4.5" width="9.5" height="9" rx="1.5" />
          <path d="M4.5 2.5h8a1.5 1.5 0 0 1 1.5 1.5v8M6.75 7v4M4.75 9h4" />
        </svg>
        {saved ? "Saved" : "Collect"}
      </button>
      {open &&
        place &&
        createPortal(
          <div
            ref={panel}
            id={panelId}
            style={{ top: place.top, left: place.left, width: PANEL_WIDTH }}
            role="dialog"
            aria-label="Add to collection"
            className="fixed z-50 overflow-hidden rounded-2xl border bg-popover text-sm shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <p
              className={cn(
                madimiOne.className,
                "bg-pink-base px-4 py-3 text-lg text-undo-surface",
              )}
            >
              Add to Collection
            </p>
            {collections === null ? (
              !error && (
                <p className="px-4 py-3 text-muted-foreground">Loading…</p>
              )
            ) : collections.length === 0 ? (
              <p className="px-4 py-3 text-muted-foreground">
                No collections yet. Make one for arts that go together.
              </p>
            ) : (
              <ul className="grid max-h-56 gap-0.5 overflow-y-auto p-2">
                {collections.map((collection) => (
                  <li key={collection.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={chosen.has(collection.id)}
                      onClick={() => toggle(collection)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-md border bg-background",
                          chosen.has(collection.id) &&
                            "border-pink-strong bg-pink-strong text-white",
                        )}
                      >
                        {chosen.has(collection.id) && (
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
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {collection.name}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {collection.count +
                          (chosen.has(collection.id) === collection.has
                            ? 0
                            : collection.has
                              ? -1
                              : 1)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {error && <p className="px-4 py-2 text-destructive">{error}</p>}
            <div className="border-t p-2">
              {name === null ? (
                <button
                  type="button"
                  onClick={() => setName("")}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left font-medium text-pink-strong transition-colors hover:bg-muted/60"
                >
                  <span aria-hidden="true">+</span> New collection
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void create();
                  }}
                  className="flex gap-2"
                >
                  <input
                    autoFocus
                    aria-label="Collection name"
                    placeholder="My favourite castles"
                    maxLength={COLLECTION_NAME_MAX}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                  />
                  <button
                    type="submit"
                    disabled={!name.trim() || creating}
                    className={modalButton(
                      "primary",
                      "h-10 rounded-xl px-4 text-sm",
                    )}
                  >
                    {creating ? "…" : "Create"}
                  </button>
                </form>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t bg-pink-base px-3 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={modalButton("secondary", "h-10 px-4 text-sm")}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!changed.length || saving}
                onClick={() => void save()}
                className={modalButton("primary", "h-10 px-4 text-sm")}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
