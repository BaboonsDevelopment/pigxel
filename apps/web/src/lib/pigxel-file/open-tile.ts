import { readCloudTile } from "./cloud";
import { createDraft, findDraftFor } from "./draft";
import { PigxelFileError, parsePigxel, stripPigxelExtension } from "./format";
import { readDriveFile, type DriveFile } from "./google-drive";
import type { CloudTile, TileLocation } from "./location";

/** The editor for one tile's draft. */
export function editorUrl(draftId: string) {
  return `/tiles/edit?id=${encodeURIComponent(draftId)}`;
}

const FULL = new PigxelFileError(
  "This browser can’t keep more tiles. Remove some from My projects, or save them to Pigxel cloud.",
);

/** Starts a draft for file contents; checks they are a valid .pigxel file first. */
export function draftFromFile(
  userId: string,
  contents: string,
  fileName: string,
  location: TileLocation | null,
): string {
  parsePigxel(contents);
  const draft = createDraft(userId, {
    name: stripPigxelExtension(fileName),
    file: contents,
    location,
    dirty: false,
  });
  if (!draft) throw FULL;
  return draft.id;
}

/** The draft for a cloud tile: the one already open here, or a fresh download. */
export async function draftForCloudTile(
  userId: string,
  tile: CloudTile,
): Promise<string> {
  const location: TileLocation = { kind: "cloud", tile };
  const open = findDraftFor(userId, location);
  if (open) return open.id;
  return draftFromFile(
    userId,
    await readCloudTile(tile.id),
    tile.name,
    location,
  );
}

/** The draft for a Google Drive file: the one already open here, or a fresh download. */
export async function draftForDriveFile(
  userId: string,
  file: DriveFile,
): Promise<string> {
  const location: TileLocation = { kind: "drive", file };
  const open = findDraftFor(userId, location);
  if (open) return open.id;
  return draftFromFile(
    userId,
    await readDriveFile(file.id),
    file.name,
    location,
  );
}
