"use client";

import { listCloudTiles } from "@/lib/pigxel-file/cloud";
import type { TileFile } from "../use-tile-file";
import { FilesDialog } from "./files-dialog";

export default function OpenTileDialog({
  file,
  onClose,
}: {
  file: TileFile;
  onClose: () => void;
}) {
  return (
    <FilesDialog
      title="Open from Pigxel Cloud"
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
}
