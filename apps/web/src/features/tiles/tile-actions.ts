"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CloudError, type CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { restoreProjects, trashProjects } from "./actions";
import { useInvalidateProjects } from "./queries/project-list";
import { showSnackbar, showUndo, withLoading } from "@/components/ui/snackbar";
import { TRASH_DAYS } from "./constants";
import {
  findDraftFor,
  loadDrafts,
  removeDraft,
  writeDraft,
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
  const invalidate = useInvalidateProjects();
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
      message: `Are you sure you want to delete this project? You can restore it from Trash for ${TRASH_DAYS} days.`,
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
      showUndo("Project moved to trash.", async () => {
        const { error } = await restoreProjects([tile.id]);
        if (error) return showSnackbar(error);
        unremove();
        router.refresh();
        void invalidate();
      });
    } catch (e) {
      unremove();
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
  const { error } = await trashProjects([tile.id]);
  if (error) throw new CloudError(error);
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
  const confirmed =
    tile.location?.kind === "drive"
      ? await confirmDeleteProject({
          title: "Remove from Browser",
          confirmLabel: "Remove",
          name: tile.name,
          thumbnail: draftThumbnail(tile),
          detail: "Google Drive",
          message: `Are you sure you want to remove this project from this browser? It stays in Google Drive${tile.dirty ? ", without the changes not yet saved there" : ""}.`,
        })
      : await confirmDeleteProject({
          name: tile.name,
          thumbnail: draftThumbnail(tile),
          message: DELETE_FOR_GOOD,
        });
  if (!confirmed) return false;
  removeDraft(userId, tile.id);
  return true;
}
