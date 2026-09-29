"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CloudError,
  deleteCloudTile,
  type CloudTileSummary,
} from "@/lib/pigxel-file/cloud";
import { findDraftFor, writeDraft } from "@/lib/pigxel-file/draft";
import { PigxelFileError } from "@/lib/pigxel-file/format";
import { draftForCloudTile, editorUrl } from "@/lib/pigxel-file/open-tile";
import { PIGXEL_EXTENSION } from "@/lib/pigxel-file/format";

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
  const tiles = limit ? allTiles.slice(0, limit) : allTiles;
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (tile: CloudTileSummary) => {
    setBusy(tile.id);
    setError(null);
    try {
      // Reuses the tile's draft when it's already open in this browser.
      const draftId = await draftForCloudTile(userId, {
        id: tile.id,
        name: tile.name,
      });
      router.push(editorUrl(draftId));
    } catch (e) {
      setError(
        e instanceof CloudError || e instanceof PigxelFileError
          ? e.message
          : "Couldn’t open the tile.",
      );
      setBusy(null);
    }
  };

  const remove = async (tile: CloudTileSummary) => {
    if (!window.confirm(`Delete “${tile.name}” from Pigxel cloud?`)) return;
    setBusy(tile.id);
    setError(null);
    try {
      await deleteCloudTile(tile.id);
      // A copy open in this browser stays, as a tile kept only here.
      const open = findDraftFor(userId, {
        kind: "cloud",
        tile: { id: tile.id, name: tile.name },
      });
      if (open)
        writeDraft(userId, {
          id: open.id,
          name: open.name,
          file: open.file,
          location: null,
          dirty: true,
        });
      router.refresh();
    } catch (e) {
      setError(
        e instanceof CloudError ? e.message : "Couldn’t delete the tile.",
      );
    } finally {
      setBusy(null);
    }
  };

  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby="cloud-tiles-heading" className="mt-12">
      <h2 id="cloud-tiles-heading" className="mb-4 font-semibold">
        In Pigxel cloud
      </h2>
      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
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
              <span className="flex aspect-square items-center justify-center bg-[repeating-conic-gradient(#e5e5e5_0_25%,#fff_0_50%)] bg-[length:12px_12px] p-4">
                {tile.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element -- a tiny data URL
                  <img
                    src={tile.thumbnail}
                    alt=""
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
