"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CloudError, type CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { deleteProjects } from "./actions";
import { showSuccess, withLoading } from "@/components/ui/snackbar";
import {
  findDraftFor,
  loadDrafts,
  removeDraft,
  type Draft,
} from "@/lib/pigxel-file/draft";
import { PigxelFileError } from "@/lib/pigxel-file/format";
import { draftForCloudTile, editorUrl } from "@/lib/pigxel-file/open-tile";
import { draftThumbnail } from "@/lib/pigxel-file/thumbnail";
import {
  confirmDeleteProject,
  DELETE_FOR_GOOD,
} from "./components/delete-project-dialog";

export function useCloudTileActions(userId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());

  const open = async (tile: CloudTileSummary) => {
    setBusy(tile.id);
    setError(null);
    try {
      const draftId = await withLoading("Opening project…", () =>
        draftForCloudTile(userId, { id: tile.id, name: tile.name }),
      );
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
    const confirmed = await confirmDeleteProject({
      name: tile.name,
      thumbnail: tile.thumbnail,
      size: tile,
      message: DELETE_FOR_GOOD,
    });
    if (!confirmed) return;
    setError(null);
    setRemoved((ids) => new Set(ids).add(tile.id));
    const unremove = () =>
      setRemoved((ids) => {
        const next = new Set(ids);
        next.delete(tile.id);
        return next;
      });
    try {
      await deleteCloudProject(userId, tile);
      router.refresh();
      showSuccess("Project deleted.");
    } catch (e) {
      unremove();
      setError(
        e instanceof CloudError ? e.message : "Couldn’t delete the tile.",
      );
    }
  };

  return { busy, error, removed, open, remove };
}

/** Deletes a cloud project for good, with its working copy in this browser. */
export async function deleteCloudProject(
  userId: string,
  tile: { id: string; name: string },
) {
  const { error } = await deleteProjects([tile.id]);
  if (error) throw new CloudError(error);
  await loadDrafts(userId);
  const open = findDraftFor(userId, {
    kind: "cloud",
    tile: { id: tile.id, name: tile.name },
  });
  if (open) removeDraft(userId, open.id);
}

export async function confirmRemoveLocalTile(
  userId: string,
  tile: Draft,
): Promise<boolean> {
  const confirmed = await confirmDeleteProject({
    name: tile.name,
    thumbnail: draftThumbnail(tile),
    message: DELETE_FOR_GOOD,
  });
  if (!confirmed) return false;
  removeDraft(userId, tile.id);
  return true;
}
