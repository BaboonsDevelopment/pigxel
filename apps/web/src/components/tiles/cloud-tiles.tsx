"use client";

import { FormMessage } from "@pigxel/ui/components/field";
import { SectionTitle } from "@pigxel/ui/components/typography";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { PIGXEL_EXTENSION } from "@/lib/pigxel-file/format";
import { useCloudTileActions } from "./tile-actions";

/** The person's Pigxel cloud tiles; each opens in its own editor draft. */
export function CloudTiles({
  userId,
  tiles: allTiles,
  limit,
}: {
  userId: string;
  tiles: CloudTileSummary[];
  /** Shows only the most recent tiles, e.g. on Home. */
  limit?: number;
}) {
  const { busy, error, removed, open, remove } = useCloudTileActions(userId);
  const visible = allTiles.filter((tile) => !removed.has(tile.id));
  const tiles = limit ? visible.slice(0, limit) : visible;

  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby="cloud-tiles-heading" className="mt-12">
      <SectionTitle id="cloud-tiles-heading" className="mb-4">
        In Pigxel cloud
      </SectionTitle>
      {error && (
        <FormMessage tone="error" className="mb-4">
          {error}
        </FormMessage>
      )}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
        {tiles.map((tile) => (
          <li
            key={tile.id}
            className="group relative overflow-hidden rounded-lg border"
          >
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void open(tile)}
              className="block w-full text-left disabled:opacity-60"
            >
              <span className="flex aspect-square items-center justify-center bg-checker p-4">
                {tile.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element -- a tiny data URL
                  <img
                    src={tile.thumbnail}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-contain [image-rendering:pixelated]"
                  />
                )}
              </span>
              <span className="block border-t px-3 py-2">
                <span className="block truncate text-sm font-medium">
                  {tile.name}
                  <span className="font-normal text-muted-foreground">
                    {PIGXEL_EXTENSION}
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  {busy === tile.id
                    ? "Opening…"
                    : `${tile.width} × ${tile.height} · ${new Date(tile.updatedAt).toLocaleDateString()}`}
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-label={`Delete ${tile.name}`}
              title="Delete from Pigxel cloud"
              disabled={busy !== null}
              onClick={() => void remove(tile)}
              className="absolute top-2 right-2 rounded-md bg-background/90 px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
