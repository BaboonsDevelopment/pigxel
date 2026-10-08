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
  loadDrafts,
  removeDraft,
  writeDraft,
  type Draft,
} from "@/lib/pigxel-file/draft";
import { PigxelFileError } from "@/lib/pigxel-file/format";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { draftForCloudTile, editorUrl } from "@/lib/pigxel-file/open-tile";

export function useCloudTileActions(userId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());

  const open = async (tile: CloudTileSummary) => {
    setBusy(tile.id);
    setError(null);
    try {
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
    const confirmed = await confirmDialog({
      title: "Delete tile?",
      message: `“${tile.name}” will be deleted from Pigxel cloud.`,
      confirmLabel: "Delete",
    });
    if (!confirmed) return;
    setError(null);
    setRemoved((ids) => new Set(ids).add(tile.id));
    try {
      await deleteCloudProject(userId, tile);
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

export async function deleteCloudProject(
  userId: string,
  tile: { id: string; name: string },
) {
  await deleteCloudTile(tile.id);
  await loadDrafts(userId);
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
}

export async function confirmRemoveLocalTile(
  userId: string,
  tile: Draft,
): Promise<boolean> {
  const confirmed = await confirmDialog(
    tile.location?.kind === "drive"
      ? {
          title: "Remove from this browser?",
          message: `“${tile.name}” stays in Google Drive${tile.dirty ? ", without the changes not yet saved there" : ""}.`,
          confirmLabel: "Remove",
        }
      : {
          title: "Delete tile?",
          message: `“${tile.name}” is only kept in this browser, so it will be gone for good.`,
          confirmLabel: "Delete",
        },
  );
  if (!confirmed) return false;
  removeDraft(userId, tile.id);
  return true;
}
