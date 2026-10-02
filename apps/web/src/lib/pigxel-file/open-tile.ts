import { readCloudTile } from "./cloud";
import { createDraft, findDraftFor, loadDrafts } from "./draft";
import {
  PigxelFileError,
  parsePigxel,
  serializePigxel,
  stripPigxelExtension,
  type PigxelDocument,
} from "./format";
import { readDriveFile, type DriveFile } from "./google-drive";
import type { CloudTile, TileLocation } from "./location";

/** The editor for one tile's draft. */
export function editorUrl(draftId: string) {
  return `/tiles/edit?id=${encodeURIComponent(draftId)}`;
}

/** The editor for a draft with a tutorial's interactive guide open. */
export function guideUrl(draftId: string, slug: string) {
  return `${editorUrl(draftId)}&guide=${encodeURIComponent(slug)}`;
}

const REFUSED = new PigxelFileError(
  "This browser won’t keep tiles. Allow site data for Pigxel, or remove some tiles from My projects.",
);

/** Starts a draft for file contents; checks they are a valid .pigxel file first. */
export async function draftFromFile(
  userId: string,
  contents: string,
  fileName: string,
  location: TileLocation | null,
): Promise<string> {
  parsePigxel(contents);
  await loadDrafts(userId);
  const draft = createDraft(userId, {
    name: stripPigxelExtension(fileName),
    file: contents,
    location,
    dirty: false,
  });
  if (!draft) throw REFUSED;
  return draft.id;
}

/**
 * Starts a draft for a tile made here, e.g. from a picture, already saved to
 * `location`. With none it is saved nowhere yet, so it starts with unsaved
 * changes.
 */
export async function draftFromDocument(
  userId: string,
  doc: PigxelDocument,
  name: string,
  location: TileLocation | null = null,
): Promise<string> {
  await loadDrafts(userId);
  const draft = createDraft(userId, {
    name,
    file: serializePigxel(doc),
    location,
    dirty: !location,
  });
  if (!draft) throw REFUSED;
  return draft.id;
}

/** The draft for a cloud tile: the one already open here, or a fresh download. */
export async function draftForCloudTile(
  userId: string,
  tile: CloudTile,
): Promise<string> {
  const location: TileLocation = { kind: "cloud", tile };
  await loadDrafts(userId);
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
  await loadDrafts(userId);
  const open = findDraftFor(userId, location);
  if (open) return open.id;
  return draftFromFile(
    userId,
    await readDriveFile(file.id),
    file.name,
    location,
  );
}
