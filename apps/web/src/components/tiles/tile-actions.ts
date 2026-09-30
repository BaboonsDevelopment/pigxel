"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CloudError,
  deleteCloudTile,
  type CloudTileSummary,
} from "@/lib/pigxel-file/cloud";
import {
  findDraftFor,
  removeDraft,
  writeDraft,
  type Draft,
} from "@/lib/pigxel-file/draft";
import { PigxelFileError } from "@/lib/pigxel-file/format";
import { draftForCloudTile, editorUrl } from "@/lib/pigxel-file/open-tile";

/** Opening and deleting Pigxel cloud tiles, shared by Home and My projects. */
export function useCloudTileActions(userId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Deleted tiles disappear at once; one comes back if deleting it fails.
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());

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
    setError(null);
    setRemoved((ids) => new Set(ids).add(tile.id));
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
      setRemoved((ids) => {
        const next = new Set(ids);
        next.delete(tile.id);
        return next;
      });
      setError(
        e instanceof CloudError ? e.message : "Couldn’t delete the tile.",
      );
    }
  };

  return { busy, error, removed, open, remove };
}

/** Asks, then removes a tile kept in this browser; returns whether it was removed. */
export function confirmRemoveLocalTile(userId: string, tile: Draft): boolean {
  const question =
    tile.location?.kind === "drive"
      ? `Remove “${tile.name}” from this browser? It stays in Google Drive${tile.dirty ? ", without the changes not yet saved there" : ""}.`
      : `“${tile.name}” is only kept in this browser. Remove it for good?`;
  if (!window.confirm(question)) return false;
  removeDraft(userId, tile.id);
  return true;
}
