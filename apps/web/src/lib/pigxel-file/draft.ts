import { DEFAULT_PEN, type PenSettings } from "@/components/pixel-canvas/pen";
import type { DriveFile } from "./google-drive";
import type { TileLocation } from "./location";

/**
 * Tiles being worked on, kept in the browser so they survive navigating
 * around the site and reloading. Each tile has its own draft, so creating or
 * opening a tile never replaces another. Drafts are kept per signed-in user,
 * so people sharing a browser never see each other's work.
 *
 * They live in IndexedDB, which holds far more than localStorage's few
 * megabytes (a couple of imported pictures used to fill that). `loadDrafts`
 * reads them once per page; after that reading and writing are immediate,
 * and every write is stored in the background.
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

/** Where drafts are stored: IndexedDB, or localStorage when it's unavailable. */
export type DraftBackend = {
  all: (userId: string) => Promise<Draft[]>;
  /** May throw at once (localStorage is full) or fail later (IndexedDB). */
  put: (userId: string, draft: Draft) => void | Promise<void>;
  remove: (userId: string, id: string) => void | Promise<void>;
};

const PREFIX = "pigxel:";

export function draftKey(userId: string, id: string) {
  return `${PREFIX}draft:v2:${userId}:${id}`;
}
const penKey = (userId: string) => `${PREFIX}pen:v1:${userId}`;
/** The single draft kept before tiles had their own drafts. */
const legacyKey = (userId: string) => `${PREFIX}draft:v1:${userId}`;

/** The signed-in person's drafts, once read; with no backend they last this page only. */
let loaded: {
  userId: string;
  drafts: Map<string, Draft>;
  backend: DraftBackend | null;
} | null = null;
let loading: { userId: string; done: Promise<void> } | null = null;
const listeners = new Set<() => void>();

/**
 * Other tabs of the site in this browser. Each keeps its own copy of the
 * drafts, so every write and removal is told to the others: a tab opening a
 * tile changed elsewhere shows the latest, instead of an old copy it would
 * then save over the new one.
 */
type DraftMessage = { userId: string } & (
  { draft: Draft } | { removed: string }
);
let otherTabs: BroadcastChannel | null = null;
/** Messages that came while this tab was still reading its drafts. */
let early: DraftMessage[] = [];

function listenToOtherTabs() {
  if (otherTabs || typeof BroadcastChannel === "undefined") return;
  otherTabs = new BroadcastChannel("pigxel:drafts");
  otherTabs.onmessage = ({ data }: MessageEvent<DraftMessage>) => {
    if (loaded?.userId === data.userId) applyMessage(loaded.drafts, data);
    else if (loading?.userId === data.userId) early.push(data);
  };
}

function applyMessage(drafts: Map<string, Draft>, message: DraftMessage) {
  if ("removed" in message) return void drafts.delete(message.removed);
  const known = drafts.get(message.draft.id);
  if (!known || known.savedAt <= message.draft.savedAt)
    drafts.set(message.draft.id, message.draft);
}

function tellOtherTabs(message: DraftMessage) {
  try {
    otherTabs?.postMessage(message);
  } catch {
    // The other tabs read the drafts again when they reload.
  }
}

/**
 * Reads this person's drafts from the browser, once per page. Drafts kept in
 * localStorage by earlier versions move to IndexedDB, freeing localStorage.
 */
export function loadDrafts(userId: string): Promise<void> {
  if (loaded?.userId === userId) return Promise.resolve();
  if (loading?.userId === userId) return loading.done;
  // Listening starts before reading, so no change from another tab is missed.
  listenToOtherTabs();
  early = [];
  const done = (async () => {
    const storage = browserStorage();
    const indexed = await indexedDbBackend();
    if (indexed && storage) await moveToIndexedDb(userId, storage, indexed);
    await startDrafts(
      userId,
      indexed ??
        (storage && canStore(storage) ? storageBackend(storage) : null),
    );
  })();
  loading = { userId, done };
  return done;
}

/** Reads drafts from `backend` (null keeps them for this page only); for tests and `loadDrafts`. */
export async function startDrafts(
  userId: string,
  backend: DraftBackend | null,
) {
  let drafts: Draft[] = [];
  try {
    drafts = (await backend?.all(userId)) ?? [];
  } catch {
    // Unreadable storage starts empty.
  }
  const byId = new Map(drafts.map((draft) => [draft.id, draft]));
  for (const message of early)
    if (message.userId === userId) applyMessage(byId, message);
  early = [];
  loaded = { userId, drafts: byId, backend };
  listeners.forEach((listener) => listener());
}

/** Whether `loadDrafts` has finished for this person. */
export function draftsLoaded(userId: string) {
  return loaded?.userId === userId;
}

/** Calls `listener` whenever drafts finish loading; returns how to stop. */
export function onDraftsLoaded(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

const draftsOf = (userId: string) =>
  loaded?.userId === userId ? loaded : null;

/** A tile's draft, or null when there is none or drafts aren't loaded. */
export function readDraft(userId: string, id: string): Draft | null {
  return draftsOf(userId)?.drafts.get(id) ?? null;
}

/** All of this person's drafts in this browser, most recently changed first. */
export function listDrafts(userId: string): Draft[] {
  return [...(draftsOf(userId)?.drafts.values() ?? [])].sort(
    (a, b) => b.savedAt - a.savedAt,
  );
}

/** The draft of a tile that lives in Pigxel cloud or Google Drive, if it's open here already. */
export function findDraftFor(
  userId: string,
  location: TileLocation,
): Draft | null {
  const id = locationId(location);
  return (
    listDrafts(userId).find(
      (draft) =>
        draft.location?.kind === location.kind &&
        locationId(draft.location) === id,
    ) ?? null
  );
}

/** Saves a draft; returns false when the browser refuses (full or blocked storage). */
export function writeDraft(userId: string, draft: DraftInput): boolean {
  const store = draftsOf(userId);
  if (!store?.backend) return false;
  const saved = { ...draft, savedAt: Date.now() };
  try {
    void Promise.resolve(store.backend.put(userId, saved)).catch(() => {
      // The draft is still kept for this page.
    });
  } catch {
    return false;
  }
  store.drafts.set(draft.id, saved);
  tellOtherTabs({ userId, draft: saved });
  return true;
}

/** Starts a new draft and returns it, or null when the browser won't keep it. */
export function createDraft(
  userId: string,
  draft: Omit<DraftInput, "id">,
): Draft | null {
  const created = { ...draft, id: newDraftId() };
  return writeDraft(userId, created) ? readDraft(userId, created.id) : null;
}

export function removeDraft(userId: string, id: string) {
  const store = draftsOf(userId);
  if (!store) return;
  store.drafts.delete(id);
  tellOtherTabs({ userId, removed: id });
  try {
    void Promise.resolve(store.backend?.remove(userId, id)).catch(() => {});
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
export function canStoreDrafts(userId: string): boolean {
  return Boolean(draftsOf(userId)?.backend);
}

/** Drafts in localStorage, as kept before IndexedDB; also the fallback without it. */
export function storageBackend(storage: Storage): DraftBackend {
  return {
    all: async (userId) => {
      migrateLegacyDraft(userId, storage);
      const prefix = draftKey(userId, "");
      const drafts: Draft[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key?.startsWith(prefix)) continue;
        const draft = parseDraft(safeGet(storage, key));
        if (draft) drafts.push(draft);
      }
      return drafts;
    },
    put: (userId, draft) =>
      storage.setItem(draftKey(userId, draft.id), JSON.stringify(draft)),
    remove: (userId, id) => storage.removeItem(draftKey(userId, id)),
  };
}

/** Moves drafts kept in localStorage into `target`, removing each once it's there. */
export async function moveToIndexedDb(
  userId: string,
  storage: Storage,
  target: DraftBackend,
) {
  try {
    const old = storageBackend(storage);
    for (const draft of await old.all(userId)) {
      await target.put(userId, draft);
      old.remove(userId, draft.id);
    }
  } catch {
    // Whatever didn't move stays in localStorage and moves next time.
  }
}

const DB_NAME = "pigxel";
const STORE = "drafts";

type DraftRecord = Draft & { key: string; userId: string };

/** Drafts in IndexedDB, or null when the browser won't open it. */
async function indexedDbBackend(): Promise<DraftBackend | null> {
  let db: IDBDatabase;
  try {
    if (typeof indexedDB === "undefined") return null;
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open(DB_NAME, 1);
      open.onupgradeneeded = () =>
        open.result
          .createObjectStore(STORE, { keyPath: "key" })
          .createIndex("userId", "userId");
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
      open.onblocked = () => reject(new Error("blocked"));
    });
  } catch {
    return null;
  }
  const run = <T>(
    mode: IDBTransactionMode,
    request: (store: IDBObjectStore) => IDBRequest<T>,
  ) =>
    new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = request(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  return {
    all: async (userId) =>
      (
        await run("readonly", (store) => store.index("userId").getAll(userId))
      ).flatMap((record: DraftRecord) => {
        const draft = parseDraft(record);
        return draft ? [draft] : [];
      }),
    put: async (userId, draft) => {
      await run("readwrite", (store) =>
        store.put({ ...draft, key: draftKey(userId, draft.id), userId }),
      );
    },
    remove: async (userId, id) => {
      await run("readwrite", (store) => store.delete(draftKey(userId, id)));
    },
  };
}

function locationId(location: TileLocation) {
  return location.kind === "cloud" ? location.tile.id : location.file.id;
}

function newDraftId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/** A stored draft (JSON from localStorage, or an IndexedDB record), or null when unreadable. */
function parseDraft(raw: string | object | null): Draft | null {
  if (!raw) return null;
  try {
    const draft = (
      typeof raw === "string" ? JSON.parse(raw) : raw
    ) as Partial<Draft>;
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
function migrateLegacyDraft(userId: string, storage: Storage) {
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
      storage.setItem(
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
    storage.removeItem(legacyKey(userId));
  } catch {
    // An unreadable old draft is left alone.
  }
}

/** Whether `storage` accepts writes (the browser may block site data). */
function canStore(storage: Storage) {
  try {
    storage.setItem(`${PREFIX}probe`, "1");
    storage.removeItem(`${PREFIX}probe`);
    return true;
  } catch {
    return false;
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
