"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CloudError,
  readCloudTile,
  saveCloudTile,
  type CloudTileSummary,
} from "@/lib/pigxel-file/cloud";
import {
  createDraft,
  findDraftFor,
  loadDrafts,
  removeDraft,
  writeDraft,
  type Draft,
} from "@/lib/pigxel-file/draft";
import {
  parsePigxel,
  PigxelFileError,
  type PigxelDocument,
} from "@/lib/pigxel-file/format";
import { thumbnailDataUrl } from "@/lib/pigxel-file/thumbnail";
import {
  deleteProjectsForever,
  moveTileToFolder,
  publishProjects,
  renameTile,
  restoreProjects,
  setProjectArchived,
  setProjectPinned,
} from "../../../../actions";
import {
  patchProjectLists,
  useInvalidateProjects,
} from "../../../../queries/project-list";
import { deleteCloudProject } from "../../../../tile-actions";
import {
  showSnackbar,
  showSuccess,
  showUndo,
  withLoading,
} from "@/components/ui/snackbar";
import type { Project } from "../../helpers";
import type { useLocalProjects } from "./use-local-projects";

type Result = { error?: string };

async function ensure(result: Promise<Result>) {
  const { error } = await result;
  if (error) throw new Error(error);
}

const messageOf = (error: unknown, fallback: string) =>
  error instanceof CloudError ||
  error instanceof PigxelFileError ||
  error instanceof Error
    ? error.message
    : fallback;

const PROJECT_DUPLICATED = "Project duplicated!";
const PROJECT_RENAMED = "Project renamed!";
const DUPLICATE_FAILED = "Couldn’t duplicate the project. Try again.";

export function useProjectActions({
  userId,
  folderId,
  archived,
  local,
}: {
  userId: string;
  folderId: string | null;
  archived: boolean;
  local: ReturnType<typeof useLocalProjects>;
}) {
  const client = useQueryClient();
  const invalidate = useInvalidateProjects();
  const [error, setError] = useState<string | null>(null);
  const fail = (e: unknown) => setError(messageOf(e, "Something went wrong."));
  const inThisFolder = (params: { folderId: string | null }) =>
    params.folderId === folderId;
  const undoWith = (result: () => Promise<Result>) => async () => {
    const { error } = await result();
    if (error) showSnackbar(error);
    void invalidate();
  };

  const pinMutation = useMutation({
    mutationFn: ({ tile, on }: { tile: CloudTileSummary; on: boolean }) =>
      ensure(setProjectPinned(tile.id, on)),
    onMutate: ({ tile, on }) =>
      patchProjectLists(client, tile.id, {
        pinnedAt: on ? new Date().toISOString() : null,
      }),
    onError: fail,
    onSettled: invalidate,
  });

  const archiveMutation = useMutation({
    mutationFn: (tile: CloudTileSummary) =>
      ensure(setProjectArchived(tile.id, !archived)),
    onMutate: (tile) =>
      patchProjectLists(
        client,
        tile.id,
        null,
        (params) => params.archived === archived,
      ),
    onError: fail,
    onSuccess: (_, tile) =>
      showUndo(
        archived ? "Project unarchived." : "Project archived.",
        undoWith(() => setProjectArchived(tile.id, archived)),
      ),
    onSettled: invalidate,
  });

  const renameMutation = useMutation({
    mutationFn: async ({
      tile,
      name,
    }: {
      tile: CloudTileSummary;
      name: string;
    }) => {
      await ensure(renameTile(tile.id, name));
      await loadDrafts(userId);
      const open = findDraftFor(userId, { kind: "cloud", tile });
      if (open?.location?.kind === "cloud")
        writeDraft(userId, {
          ...open,
          name,
          location: { kind: "cloud", tile: { ...open.location.tile, name } },
        });
    },
    onMutate: ({ tile, name }) => patchProjectLists(client, tile.id, { name }),
    onSettled: invalidate,
  });

  const duplicateMutation = useMutation({
    mutationFn: ({
      tile,
      name,
      target,
    }: {
      tile: CloudTileSummary;
      name: string;
      target: string | null;
    }) =>
      withLoading("Duplicating…", async () => {
        const file = await readCloudTile(tile.id);
        const image = parsePigxel(file);
        const copy = await saveCloudTile(
          { name },
          file,
          image,
          thumbnailDataUrl(image),
        );
        if (target) await ensure(moveTileToFolder(copy.id, target));
      }),
    onSuccess: () => showSuccess(PROJECT_DUPLICATED),
    onSettled: invalidate,
  });

  const removeFromFolderMutation = useMutation({
    mutationFn: (tile: CloudTileSummary) =>
      ensure(moveTileToFolder(tile.id, null)),
    onMutate: (tile) => patchProjectLists(client, tile.id, null, inThisFolder),
    onError: fail,
    onSuccess: (_, tile) =>
      showUndo(
        "Removed from folder.",
        undoWith(() => moveTileToFolder(tile.id, folderId)),
      ),
    onSettled: invalidate,
  });

  const publishManyMutation = useMutation({
    mutationFn: (tiles: CloudTileSummary[]) =>
      ensure(publishProjects(tiles.map((tile) => tile.id))),
    onMutate: (tiles) =>
      tiles.forEach((tile) =>
        patchProjectLists(client, tile.id, { published: true }),
      ),
    onError: fail,
    onSettled: invalidate,
  });

  const deleteManyMutation = useMutation({
    mutationFn: async (projects: Project[]) => {
      for (const project of projects)
        if (project.kind === "local") removeDraft(userId, project.id);
      local.refresh();
      await Promise.all(
        projects.flatMap((project) =>
          project.kind === "cloud"
            ? [deleteCloudProject(userId, project.tile)]
            : [],
        ),
      );
    },
    onMutate: (projects) =>
      projects.forEach((project) => {
        if (project.kind === "cloud")
          patchProjectLists(client, project.id, null);
      }),
    onError: fail,
    onSuccess: (_, projects) => {
      const ids = projects.flatMap((project) =>
        project.kind === "cloud" ? [project.id] : [],
      );
      if (!ids.length) return;
      showUndo(
        ids.length === 1
          ? "Project moved to trash."
          : `${ids.length} projects moved to trash.`,
        undoWith(() => restoreProjects(ids)),
      );
    },
    onSettled: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: (tiles: CloudTileSummary[]) =>
      ensure(restoreProjects(tiles.map((tile) => tile.id))),
    onMutate: (tiles) =>
      tiles.forEach((tile) =>
        patchProjectLists(client, tile.id, null, (params) => params.trashed),
      ),
    onError: fail,
    onSuccess: (_, tiles) =>
      showSuccess(
        tiles.length === 1
          ? "Project restored!"
          : `${tiles.length} projects restored!`,
      ),
    onSettled: invalidate,
  });

  const forgetMutation = useMutation({
    mutationFn: ({ tiles, all }: { tiles: CloudTileSummary[]; all: boolean }) =>
      ensure(deleteProjectsForever(all ? "all" : tiles.map((tile) => tile.id))),
    onMutate: ({ tiles }) =>
      tiles.forEach((tile) =>
        patchProjectLists(client, tile.id, null, (params) => params.trashed),
      ),
    onError: fail,
    onSettled: invalidate,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      draft,
      image,
    }: {
      draft: Draft;
      image: PigxelDocument;
    }): Promise<CloudTileSummary> => {
      const thumbnail = thumbnailDataUrl(image);
      const tile = await withLoading("Uploading…", () =>
        saveCloudTile({ name: draft.name }, draft.file, image, thumbnail),
      );
      writeDraft(userId, {
        id: draft.id,
        name: draft.name,
        file: draft.file,
        location: { kind: "cloud", tile },
        dirty: false,
      });
      local.refresh();
      return {
        id: tile.id,
        name: tile.name,
        width: image.width,
        height: image.height,
        thumbnail,
        updatedAt: new Date().toISOString(),
        published: false,
      };
    },
    onError: (e) =>
      setError(messageOf(e, "Couldn’t save to Pigxel cloud. Try again.")),
    onSettled: invalidate,
  });

  return {
    error,
    clearError: () => setError(null),
    duplicating: duplicateMutation.isPending
      ? duplicateMutation.variables.tile.id
      : null,
    uploading: uploadMutation.isPending
      ? uploadMutation.variables.draft.id
      : null,

    togglePin: (project: Project, on: boolean) => {
      setError(null);
      if (project.kind === "local") local.pin(project.id, on);
      else pinMutation.mutate({ tile: project.tile, on });
    },

    toggleArchive: (project: Project) => {
      setError(null);
      if (project.kind !== "local") return archiveMutation.mutate(project.tile);
      local.archive(project.id, !archived);
      showUndo(archived ? "Project unarchived." : "Project archived.", () =>
        local.archive(project.id, archived),
      );
    },

    rename: async (project: Project, name: string): Promise<string | null> => {
      if (project.kind === "local") {
        if (!writeDraft(userId, { ...project.draft, name }))
          return "Couldn’t rename the project. Try again.";
        local.refresh();
        showSuccess(PROJECT_RENAMED);
        return null;
      }
      try {
        await renameMutation.mutateAsync({ tile: project.tile, name });
        showSuccess(PROJECT_RENAMED);
        return null;
      } catch (e) {
        return messageOf(e, "Couldn’t rename the project. Try again.");
      }
    },

    duplicate: async (
      project: Project,
      name: string,
      target: string | null,
    ): Promise<string | null> => {
      if (project.kind === "cloud")
        try {
          await duplicateMutation.mutateAsync({
            tile: project.tile,
            name,
            target,
          });
          return null;
        } catch (e) {
          return messageOf(e, DUPLICATE_FAILED);
        }
      const copy = createDraft(userId, {
        name,
        file: project.draft.file,
        location: null,
        dirty: true,
      });
      if (!copy) return DUPLICATE_FAILED;
      local.refresh();
      showSuccess(PROJECT_DUPLICATED);
      return null;
    },

    removeFromFolder: (tile: CloudTileSummary) => {
      setError(null);
      removeFromFolderMutation.mutate(tile);
    },

    upload: (draft: Draft, image: PigxelDocument) => {
      setError(null);
      return uploadMutation.mutateAsync({ draft, image });
    },

    moved: (tiles: CloudTileSummary[], to: string | null) => {
      if (folderId && to !== folderId)
        tiles.forEach((tile) =>
          patchProjectLists(client, tile.id, null, inThisFolder),
        );
      void invalidate();
    },

    publishMany: (tiles: CloudTileSummary[]) => {
      setError(null);
      return publishManyMutation.mutateAsync(tiles);
    },

    deleteMany: (projects: Project[]) => {
      setError(null);
      return deleteManyMutation.mutateAsync(projects);
    },

    batchBusy: publishManyMutation.isPending || deleteManyMutation.isPending,

    published: (tile: CloudTileSummary, value: boolean) => {
      patchProjectLists(client, tile.id, { published: value });
      void invalidate();
    },

    labelled: (tile: CloudTileSummary, labels: string[]) => {
      patchProjectLists(client, tile.id, { labels });
      void invalidate();
    },

    deleted: () => void invalidate(),

    restore: (tiles: CloudTileSummary[]) => {
      setError(null);
      restoreMutation.mutate(tiles);
    },

    deleteForever: (tiles: CloudTileSummary[], all = false) => {
      setError(null);
      forgetMutation.mutate({ tiles, all });
    },
  };
}
