"use client";

import { useMutation } from "@tanstack/react-query";
import { moveTileToFolder } from "../actions";
import { movedMessage } from "../constants";
import { useInvalidateProjects } from "./project-list";
import { showSuccess } from "@/components/ui/snackbar";

export function useMoveProjects() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: async ({
      ids,
      folderId,
    }: {
      ids: string[];
      folderId: string | null;
    }) => {
      const results = await Promise.all(
        ids.map((id) => moveTileToFolder(id, folderId)),
      );
      const failed = results.find((result) => result.error);
      if (failed) throw new Error(failed.error);
    },
    onSuccess: (_, { ids }) => showSuccess(movedMessage(ids.length)),
    onSettled: invalidate,
  });
}
