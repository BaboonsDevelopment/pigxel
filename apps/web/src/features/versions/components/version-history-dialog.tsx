"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { PixelImage } from "@/components/ui/pixel-image";
import { editedAgo } from "@/features/tiles/components/projects-view/helpers";
import { loadVersions, restoreVersion } from "../actions";
import type { TileVersion } from "../versions";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function VersionHistoryDialog({
  tileId,
  name,
  onRestored,
  onClose,
}: {
  tileId: string;
  name: string;
  onRestored: () => void;
  onClose: () => void;
}) {
  const versions = useQuery({
    queryKey: ["tile-versions", tileId],
    queryFn: () => loadVersions(tileId),
    staleTime: 0,
  });
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const restore = async (version: TileVersion) => {
    const confirmed = await confirmDialog({
      title: "Restore this version?",
      message: `“${name}” goes back to how it was on ${when(version.createdAt)}. What it looks like now is kept in the history, so you can switch back.`,
      confirmLabel: "Restore",
    });
    if (!confirmed) return;
    setError(null);
    setRestoring(version.id);
    const result = await restoreVersion(tileId, version.id);
    if (result.error) {
      setError(result.error);
      setRestoring(null);
      return;
    }
    onRestored();
  };

  return (
    <Dialog onClose={onClose} size="md" portal>
      <DialogHeader
        title="Version history"
        description="Pigxel cloud keeps a version of this tile every 10 minutes while it’s being edited, up to the last 50."
      />
      <DialogBody>
        {versions.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : versions.isError ? (
          <FormMessage tone="error">{versions.error.message}</FormMessage>
        ) : versions.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No earlier versions yet. Keep editing and they’ll show up here.
          </p>
        ) : (
          <ul className="-mx-2 grid gap-0.5">
            {versions.data.map((version) => (
              <li
                key={version.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary"
              >
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-checker">
                  {version.thumbnail && (
                    <PixelImage
                      src={version.thumbnail}
                      alt=""
                      className="size-full object-contain"
                    />
                  )}
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="text-sm font-medium">
                    {when(version.createdAt)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {editedAgo(Date.parse(version.createdAt))}
                    {version.author && ` · ${version.author}`} · {version.width}{" "}
                    × {version.height} px
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={restoring !== null}
                  onClick={() => void restore(version)}
                >
                  {restoring === version.id ? "Restoring…" : "Restore"}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <FormMessage tone="error" className="mt-3">
            {error}
          </FormMessage>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
