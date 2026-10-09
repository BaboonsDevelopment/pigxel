"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { readCloudTile, saveCloudTile } from "@/lib/pigxel-file/cloud";
import { parsePigxel } from "@/lib/pigxel-file/format";
import { thumbnailDataUrl } from "@/lib/pigxel-file/thumbnail";
import { findDraftFor, loadDrafts, removeDraft } from "@/lib/pigxel-file/draft";
import { leaveProject, loadSharedProjects } from "@/features/sharing/actions";
import type { SharedProject } from "@/features/sharing/sharing";
import { projectKeys } from "./keys";
import { useInvalidateProjects } from "./project-list";

export function useSharedProjects() {
  return useQuery({
    queryKey: projectKeys.shared(),
    queryFn: () => loadSharedProjects(),
    staleTime: 0,
  });
}

export function useCopySharedProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: async (project: SharedProject) => {
      const file = await readCloudTile(project.id);
      const image = parsePigxel(file);
      return saveCloudTile(
        { name: `${project.name.slice(0, 93)} (copy)` },
        file,
        image,
        thumbnailDataUrl(image),
      );
    },
    onSettled: invalidate,
  });
}

export function useLeaveSharedProject(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (project: SharedProject) => {
      const { error } = await leaveProject(project.id);
      if (error) throw new Error(error);
      await loadDrafts(userId);
      const open = findDraftFor(userId, {
        kind: "cloud",
        tile: { id: project.id, name: project.name },
      });
      if (open) removeDraft(userId, open.id);
    },
    onMutate: (project) =>
      client.setQueryData<SharedProject[]>(projectKeys.shared(), (projects) =>
        projects?.filter((p) => p.id !== project.id),
      ),
    onSettled: () =>
      client.invalidateQueries({ queryKey: projectKeys.shared() }),
  });
}
