"use client";

import { connectDriveUrl, type DriveStatus } from "@/lib/google-drive/status";
import { listCloudTiles } from "@/lib/pigxel-file/cloud";
import { DriveError, listDriveFiles } from "@/lib/pigxel-file/google-drive";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import type { OpenSource } from "../constants";
import type { TileFile } from "../use-tile-file";
import { FilesDialog } from "./files-dialog";

/** Picks a tile to open from Pigxel cloud or Google Drive. */
export default function OpenTileDialog({
  source,
  drive,
  draftId,
  file,
  onClose,
}: {
  source: OpenSource;
  drive: DriveStatus;
  /** The tile being edited, to come back to after connecting Google Drive. */
  draftId: string;
  file: TileFile;
  onClose: () => void;
}) {
  if (source === "cloud")
    return (
      <FilesDialog
        title="Open from Pigxel cloud"
        empty="No tiles in Pigxel cloud yet. Tiles you save there appear here."
        load={async () =>
          (await listCloudTiles()).map((tile) => ({
            id: tile.id,
            name: tile.name,
            modified: tile.updatedAt,
            thumbnail: tile.thumbnail,
          }))
        }
        onPick={(item) => file.openCloudTile({ id: item.id, name: item.name })}
        onClose={onClose}
      />
    );

  return (
    <FilesDialog
      title="Open from Google Drive"
      subtitle={drive.email}
      empty="No Pigxel files in your Google Drive yet. Tiles you save there appear here. To open a file uploaded to Drive yourself, download it and open it from your computer."
      load={async () =>
        (await listDriveFiles()).map((f) => ({
          id: f.id,
          name: f.name,
          modified: f.modifiedTime,
        }))
      }
      errorAction={(error) =>
        error instanceof DriveError && error.needsConnect
          ? {
              label: "Connect Google Drive",
              href: connectDriveUrl(editorUrl(draftId)),
            }
          : null
      }
      onPick={(item) => file.openDriveFile({ id: item.id, name: item.name })}
      onClose={onClose}
    />
  );
}
