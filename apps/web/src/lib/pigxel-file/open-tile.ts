import { readCloudTileVersion, sameVersion } from "./cloud";
import { createDraft, findDraftFor, loadDrafts, writeDraft } from "./draft";
import {
  PigxelFileError,
  parsePigxel,
  serializePigxel,
  stripPigxelExtension,
  type PigxelDocument,
} from "./format";
import { readDriveFile, type DriveFile } from "./google-drive";
import type { CloudTile, TileLocation } from "./location";

export function editorUrl(draftId: string) {
  return `/tiles/edit?id=${encodeURIComponent(draftId)}`;
}

export function newTileUrl(fromDraftId: string) {
  return `/tiles/new?from=${encodeURIComponent(fromDraftId)}`;
}

export function guideUrl(draftId: string, slug: string) {
  return `${editorUrl(draftId)}&guide=${encodeURIComponent(slug)}`;
}

const REFUSED = new PigxelFileError(
  "This browser won’t keep tiles. Allow site data for Pigxel, or remove some tiles from My projects.",
);

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

export async function draftForCloudTile(
  userId: string,
  tile: CloudTile,
): Promise<string> {
  const location: TileLocation = { kind: "cloud", tile };
  await loadDrafts(userId);
  const open = findDraftFor(userId, location);
  const known =
    open?.location?.kind === "cloud" ? open.location.tile.version : undefined;
  if (open?.dirty && !known) return open.id;
  const cloud = await readCloudTileVersion(tile.id);
  const latest: TileLocation = {
    kind: "cloud",
    tile: { ...tile, version: cloud.version },
  };
  if (!open) return draftFromFile(userId, cloud.file, tile.name, latest);
  if (open.dirty && sameVersion(known, cloud.version)) return open.id;
  if (cloud.file === open.file && sameVersion(known, cloud.version))
    return open.id;
  parsePigxel(cloud.file);
  if (open.dirty)
    createDraft(userId, {
      name: `${open.name.slice(0, 80)} (unsaved changes)`,
      file: open.file,
      location: null,
      dirty: true,
    });
  writeDraft(userId, {
    ...open,
    file: cloud.file,
    location: latest,
    dirty: false,
  });
  return open.id;
}

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
