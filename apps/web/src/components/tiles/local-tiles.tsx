"use client";

import Link from "next/link";
import { useState } from "react";
import { listDrafts, removeDraft, type Draft } from "@/lib/pigxel-file/draft";
import {
  PIGXEL_EXTENSION,
  parsePigxel,
  type PigxelImage,
} from "@/lib/pigxel-file/format";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { useIsClient } from "@/lib/use-is-client";
import { TileThumbnail } from "./tile-thumbnail";

type LocalTile = Draft & { image: PigxelImage };

/**
 * Tiles kept in this browser that aren't in Pigxel cloud: ones stored nowhere
 * else, and Google Drive files opened here. Cloud tiles are listed separately.
 */
export function LocalTiles(props: { userId: string; hasCloudTiles: boolean }) {
  if (!useIsClient()) return <div className="mt-8 min-h-48" />;
  return <List {...props} />;
}

function readTiles(userId: string): LocalTile[] {
  return listDrafts(userId).flatMap((draft) => {
    if (draft.location?.kind === "cloud") return [];
    try {
      return [{ ...draft, image: parsePigxel(draft.file) }];
    } catch {
      return [];
    }
  });
}

function List({
  userId,
  hasCloudTiles,
}: {
  userId: string;
  hasCloudTiles: boolean;
}) {
  const [tiles, setTiles] = useState(() => readTiles(userId));

  const remove = (tile: LocalTile) => {
    const question =
      tile.location?.kind === "drive"
        ? `Remove “${tile.name}” from this browser? It stays in Google Drive${tile.dirty ? ", without the changes not yet saved there" : ""}.`
        : `“${tile.name}” is only kept in this browser. Remove it for good?`;
    if (!window.confirm(question)) return;
    removeDraft(userId, tile.id);
    setTiles(readTiles(userId));
  };

  if (tiles.length === 0)
    return hasCloudTiles ? null : (
      <div className="mt-8 rounded-lg border border-dashed px-6 py-16 text-center">
        <p className="font-medium">No tiles yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first tile to start drawing.
        </p>
      </div>
    );

  return (
    <section aria-labelledby="local-tiles-heading" className="mt-10">
      <h2 id="local-tiles-heading" className="mb-4 font-semibold">
        In this browser
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
        {tiles.map((tile) => (
          <li
            key={tile.id}
            className="group relative overflow-hidden rounded-lg border"
          >
            <Link href={editorUrl(tile.id)} className="block">
              <span className="flex aspect-square items-center justify-center bg-[repeating-conic-gradient(#e5e5e5_0_25%,#fff_0_50%)] bg-[length:12px_12px] p-4">
                <TileThumbnail image={tile.image} />
              </span>
              <span className="block border-t px-3 py-2">
                <span className="block truncate text-sm font-medium">
                  {tile.name}
                  <span className="font-normal text-muted-foreground">
                    {PIGXEL_EXTENSION}
                  </span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {tile.location?.kind === "drive"
                    ? tile.dirty
                      ? "Google Drive · unsaved changes"
                      : "Google Drive"
                    : tile.dirty
                      ? "Only here · not downloaded"
                      : "Only here"}
                </span>
              </span>
            </Link>
            <button
              type="button"
              aria-label={`Remove ${tile.name} from this browser`}
              title="Remove from this browser"
              onClick={() => remove(tile)}
              className="absolute top-2 right-2 rounded-md bg-background/90 px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
