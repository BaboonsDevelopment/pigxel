import { DEFAULT_PEN, type PenSettings } from "@/components/pixel-canvas/pen";
import type { DriveFile } from "./google-drive";
import type { TileLocation } from "./location";

/**
 * Tiles being worked on, kept in the browser's localStorage so they survive
 * navigating around the site and reloading. Each tile has its own draft, so
 * creating or opening a tile never replaces another. Drafts are kept per
 * signed-in user, so people sharing a browser never see each other's work.
 */
export type Draft = {
  /** Identifies the draft in this browser and in the editor URL. */
  id: string;
  name: string;
  /** The tile as .pigxel file contents. */
  file: string;
  /** Where the tile lives and autosaves to: Pigxel cloud, Google Drive, or only here. */
  location: TileLocation | null;
  /** Whether it has changes that weren't downloaded or saved to its location yet. */
  dirty: boolean;
  savedAt: number;
};

export type DraftInput = Omit<Draft, "savedAt">;

const PREFIX = "pigxel:";

export function draftKey(userId: string, id: string) {
  return `${PREFIX}draft:v2:${userId}:${id}`;
}
const penKey = (userId: string) => `${PREFIX}pen:v1:${userId}`;
/** The single draft kept before tiles had their own drafts. */
const legacyKey = (userId: string) => `${PREFIX}draft:v1:${userId}`;

/** A tile's draft, or null when there is none, it's unreadable, or storage is blocked. */
export function readDraft(
  userId: string,
  id: string,
  storage: Storage | undefined = browserStorage(),
): Draft | null {
  migrateLegacyDraft(userId, storage);
  return parseDraft(safeGet(storage, draftKey(userId, id)));
}

/** All of this person's drafts in this browser, most recently changed first. */
export function listDrafts(
  userId: string,
  storage: Storage | undefined = browserStorage(),
): Draft[] {
  migrateLegacyDraft(userId, storage);
  const prefix = draftKey(userId, "");
  const drafts: Draft[] = [];
  try {
    for (let i = 0; i < (storage?.length ?? 0); i++) {
      const key = storage?.key(i);
      if (!key?.startsWith(prefix)) continue;
      const draft = parseDraft(safeGet(storage, key));
      if (draft) drafts.push(draft);
    }
  } catch {
    return [];
  }
  return drafts.sort((a, b) => b.savedAt - a.savedAt);
}

/** The draft of a tile that lives in Pigxel cloud or Google Drive, if it's open here already. */
export function findDraftFor(
  userId: string,
  location: TileLocation,
  storage: Storage | undefined = browserStorage(),
): Draft | null {
  const id = locationId(location);
  return (
    listDrafts(userId, storage).find(
      (draft) =>
        draft.location?.kind === location.kind &&
        locationId(draft.location) === id,
    ) ?? null
  );
}

/** Saves a draft; returns false when the browser refuses (full or blocked storage). */
export function writeDraft(
  userId: string,
  draft: DraftInput,
  storage: Storage | undefined = browserStorage(),
): boolean {
  try {
    storage?.setItem(
      draftKey(userId, draft.id),
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    );
    return Boolean(storage);
  } catch {
    return false;
  }
}

/** Starts a new draft and returns it, or null when the browser won't keep it. */
export function createDraft(
  userId: string,
  draft: Omit<DraftInput, "id">,
  storage: Storage | undefined = browserStorage(),
): Draft | null {
  const created = { ...draft, id: newDraftId() };
  return writeDraft(userId, created, storage)
    ? { ...created, savedAt: Date.now() }
    : null;
}

export function removeDraft(
  userId: string,
  id: string,
  storage: Storage | undefined = browserStorage(),
) {
  try {
    storage?.removeItem(draftKey(userId, id));
  } catch {
    // Nothing to remove when storage is blocked.
  }
}

/** The pen colour and size, shared by all tiles. */
export function readPen(
  userId: string,
  storage: Storage | undefined = browserStorage(),
): PenSettings {
  try {
    const raw = safeGet(storage, penKey(userId));
    return raw ? { ...DEFAULT_PEN, ...JSON.parse(raw) } : DEFAULT_PEN;
  } catch {
    return DEFAULT_PEN;
  }
}

export function writePen(
  userId: string,
  pen: PenSettings,
  storage: Storage | undefined = browserStorage(),
) {
  try {
    storage?.setItem(penKey(userId), JSON.stringify(pen));
  } catch {
    // The pen falls back to its defaults next time.
  }
}

/** Whether this browser lets the site keep drafts (it may block site data). */
export function canStoreDrafts(
  storage: Storage | undefined = browserStorage(),
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(`${PREFIX}probe`, "1");
    storage.removeItem(`${PREFIX}probe`);
    return true;
  } catch {
    return false;
  }
}

function locationId(location: TileLocation) {
  return location.kind === "cloud" ? location.tile.id : location.file.id;
}

function newDraftId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as Partial<Draft>;
    if (
      typeof draft.id !== "string" ||
      typeof draft.name !== "string" ||
      typeof draft.file !== "string"
    )
      return null;
    return {
      id: draft.id,
      name: draft.name,
      file: draft.file,
      location: draft.location ?? null,
      dirty: Boolean(draft.dirty),
      savedAt: typeof draft.savedAt === "number" ? draft.savedAt : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Moves the single draft from before per-tile drafts into the collection, with
 * its pen settings, and turns an old Google Drive link into a location.
 */
function migrateLegacyDraft(userId: string, storage: Storage | undefined) {
  const raw = safeGet(storage, legacyKey(userId));
  if (!raw) return;
  try {
    const old = JSON.parse(raw) as Partial<Draft> & {
      driveFile?: DriveFile | null;
      pen?: PenSettings;
    };
    if (typeof old.name === "string" && typeof old.file === "string") {
      const location =
        old.location ??
        (old.driveFile
          ? { kind: "drive" as const, file: old.driveFile }
          : null);
      storage?.setItem(
        draftKey(userId, "restored"),
        JSON.stringify({
          id: "restored",
          name: old.name,
          file: old.file,
          location,
          dirty: Boolean(old.dirty),
          savedAt: old.savedAt ?? Date.now(),
        }),
      );
      if (old.pen) writePen(userId, old.pen, storage);
    }
    storage?.removeItem(legacyKey(userId));
  } catch {
    // An unreadable old draft is left alone.
  }
}

function safeGet(storage: Storage | undefined, key: string) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function browserStorage() {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    // Accessing localStorage throws when the browser blocks site data.
    return undefined;
  }
}
