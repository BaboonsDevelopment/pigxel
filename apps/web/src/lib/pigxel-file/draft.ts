import {
  DEFAULT_PEN,
  type PenSettings,
} from "@/features/editor/pixel-canvas/pen";
import type { DriveFile } from "./google-drive";
import type { TileLocation } from "./location";

export type Draft = {
  id: string;
  name: string;
  file: string;
  location: TileLocation | null;
  dirty: boolean;
  savedAt: number;
};

type DraftInput = Omit<Draft, "savedAt">;

export type DraftBackend = {
  all: (userId: string) => Promise<Draft[]>;
  put: (userId: string, draft: Draft) => void | Promise<void>;
  remove: (userId: string, id: string) => void | Promise<void>;
};

const PREFIX = "pigxel:";

export function draftKey(userId: string, id: string) {
  return `${PREFIX}draft:v2:${userId}:${id}`;
}
const penKey = (userId: string) => `${PREFIX}pen:v1:${userId}`;
const legacyKey = (userId: string) => `${PREFIX}draft:v1:${userId}`;

let loaded: {
  userId: string;
  drafts: Map<string, Draft>;
  backend: DraftBackend | null;
} | null = null;
let loading: { userId: string; done: Promise<void> } | null = null;
const listeners = new Set<() => void>();

type DraftMessage = { userId: string } & (
  { draft: Draft } | { removed: string }
);
let otherTabs: BroadcastChannel | null = null;
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
  } catch {}
}

export function loadDrafts(userId: string): Promise<void> {
  if (loaded?.userId === userId) return Promise.resolve();
  if (loading?.userId === userId) return loading.done;
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

export async function startDrafts(
  userId: string,
  backend: DraftBackend | null,
) {
  let drafts: Draft[] = [];
  try {
    drafts = (await backend?.all(userId)) ?? [];
  } catch {}
  const byId = new Map(drafts.map((draft) => [draft.id, draft]));
  for (const message of early)
    if (message.userId === userId) applyMessage(byId, message);
  early = [];
  loaded = { userId, drafts: byId, backend };
  listeners.forEach((listener) => listener());
}

export function draftsLoaded(userId: string) {
  return loaded?.userId === userId;
}

export function onDraftsLoaded(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

const draftsOf = (userId: string) =>
  loaded?.userId === userId ? loaded : null;

export function readDraft(userId: string, id: string): Draft | null {
  return draftsOf(userId)?.drafts.get(id) ?? null;
}

export function listDrafts(userId: string): Draft[] {
  return [...(draftsOf(userId)?.drafts.values() ?? [])].sort(
    (a, b) => b.savedAt - a.savedAt,
  );
}

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

export function writeDraft(userId: string, draft: DraftInput): boolean {
  const store = draftsOf(userId);
  if (!store?.backend) return false;
  const saved = { ...draft, savedAt: Date.now() };
  try {
    void Promise.resolve(store.backend.put(userId, saved)).catch(() => {});
  } catch {
    return false;
  }
  store.drafts.set(draft.id, saved);
  tellOtherTabs({ userId, draft: saved });
  return true;
}

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
  } catch {}
}

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
  } catch {}
}

export function canStoreDrafts(userId: string): boolean {
  return Boolean(draftsOf(userId)?.backend);
}

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
  } catch {}
}

const DB_NAME = "pigxel";
const STORE = "drafts";

type DraftRecord = Draft & { key: string; userId: string };

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
  } catch {}
}

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
    return undefined;
  }
}
