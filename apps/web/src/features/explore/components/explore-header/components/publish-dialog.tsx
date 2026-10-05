"use client";

import { useEffect, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@pigxel/ui/components/dialog";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { Text } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";
import type { ProfileTile } from "@/features/profile/profile";
import { setTileVisibility } from "@/features/profile/actions";
import { loadUnpublishedTiles } from "../../../actions";

export function PublishDialog({ onClose }: { onClose: () => void }) {
  const [tiles, setTiles] = useState<ProfileTile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadUnpublishedTiles()
      .then(setTiles)
      .catch(() => setError("Couldn’t load your arts. Try again."));
  }, []);

  const toggle = (id: string) =>
    setSelected((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const publish = async () => {
    setPublishing(true);
    setError(null);
    const ids = [...selected];
    const results = await Promise.all(
      ids.map((id) => setTileVisibility(id, "public")),
    );
    const failed = new Set(ids.filter((_, i) => results[i]?.error));
    setPublishing(false);
    if (!failed.size) return onClose();
    setTiles((all) =>
      all ? all.filter((t) => !selected.has(t.id) || failed.has(t.id)) : all,
    );
    setSelected(failed);
    setError(
      results.find((r) => r.error)?.error ?? "Couldn’t publish. Try again.",
    );
  };

  return (
    <Dialog onClose={onClose} size="lg" portal>
      <DialogHeader
        title="Publish to Explore"
        description="Pick arts from Pigxel cloud to share with the community."
      />
      <DialogBody>
        {error && (
          <FormMessage tone="error" className="mb-3">
            {error}
          </FormMessage>
        )}
        {!tiles ? (
          !error && (
            <Text as="span" tone="muted">
              Loading…
            </Text>
          )
        ) : tiles.length === 0 ? (
          <EmptyState
            title="Nothing to publish"
            description="Save an art to Pigxel cloud and it will show up here."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiles.map((tile) => {
              const checked = selected.has(tile.id);
              return (
                <li key={tile.id}>
                  <button
                    type="button"
                    aria-pressed={checked}
                    disabled={publishing}
                    onClick={() => toggle(tile.id)}
                    className={cn(
                      "relative block w-full overflow-hidden rounded-xl border bg-card text-left transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/30",
                      checked && "border-primary ring-2 ring-primary",
                    )}
                  >
                    <span className="block aspect-[5/4] bg-checker">
                      {tile.thumbnail && (
                        <PixelImage
                          src={tile.thumbnail}
                          alt=""
                          loading="lazy"
                          className="size-full object-contain"
                        />
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-2 right-2 flex size-7 items-center justify-center rounded-full border shadow-sm transition-colors",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background text-foreground",
                      )}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-3.5"
                      >
                        <path
                          d={checked ? "m3.5 8.5 3 3 6-7" : "M8 3v10M3 8h10"}
                        />
                      </svg>
                    </span>
                    <span className="block border-t px-2.5 py-2">
                      <span className="block truncate text-sm font-semibold">
                        {tile.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {tile.width} × {tile.height} px
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogBody>
      {!!tiles?.length && (
        <DialogFooter className="items-center justify-between">
          <Text as="span" tone="muted" className="tabular-nums">
            {selected.size} selected
          </Text>
          <Button
            type="button"
            disabled={!selected.size || publishing}
            onClick={() => void publish()}
          >
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        </DialogFooter>
      )}
    </Dialog>
  );
}
