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
  moveTileToFolder,
  publishProjects,
  renameTile,
  setProjectArchived,
  setProjectPinned,
} from "../../../../actions";
import {
  patchProjectLists,
  useInvalidateProjects,
} from "../../../../queries/project-list";
import { deleteCloudProject } from "../../../../tile-actions";
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

const copyName = (name: string) => `${name.slice(0, 93)} (copy)`;

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
    mutationFn: async (tile: CloudTileSummary) => {
      const file = await readCloudTile(tile.id);
      const image = parsePigxel(file);
      const copy = await saveCloudTile(
        { name: copyName(tile.name) },
        file,
        image,
        thumbnailDataUrl(image),
      );
      if (folderId) await ensure(moveTileToFolder(copy.id, folderId));
    },
    onError: fail,
    onSettled: invalidate,
  });

  const removeFromFolderMutation = useMutation({
    mutationFn: (tile: CloudTileSummary) =>
      ensure(moveTileToFolder(tile.id, null)),
    onMutate: (tile) => patchProjectLists(client, tile.id, null, inThisFolder),
    onError: fail,
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
      const tile = await saveCloudTile(
        { name: draft.name },
        draft.file,
        image,
        thumbnail,
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
      ? duplicateMutation.variables.id
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
      if (project.kind === "local") local.archive(project.id, !archived);
      else archiveMutation.mutate(project.tile);
    },

    rename: async (project: Project, name: string): Promise<string | null> => {
      if (project.kind === "local") {
        if (!writeDraft(userId, { ...project.draft, name }))
          return "Couldn’t rename the project. Try again.";
        local.refresh();
        return null;
      }
      try {
        await renameMutation.mutateAsync({ tile: project.tile, name });
        return null;
      } catch (e) {
        return messageOf(e, "Couldn’t rename the project. Try again.");
      }
    },

    duplicate: (project: Project) => {
      setError(null);
      if (project.kind === "cloud")
        return duplicateMutation.mutate(project.tile);
      const copy = createDraft(userId, {
        name: copyName(project.name),
        file: project.draft.file,
        location: null,
        dirty: true,
      });
      if (copy) local.refresh();
      else setError("Couldn’t duplicate the project. Try again.");
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
  };
}
