const DB_NAME = "pigxel-history";
const HISTORIES = "histories";
const META = "meta";
const KEEP = 20;
const DELAY = 800;

type Meta = { key: string; userId: string; savedAt: number };

let opening: Promise<IDBDatabase | null> | null = null;

function database() {
  opening ??= new Promise<IDBDatabase | null>((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const open = indexedDB.open(DB_NAME, 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore(HISTORIES);
        open.result
          .createObjectStore(META, { keyPath: "key" })
          .createIndex("userId", "userId");
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => resolve(null);
      open.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

export function fingerprint(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${text.length}:${(hash >>> 0).toString(36)}`;
}

const keyOf = (userId: string, tileId: string) => `${userId}:${tileId}`;

export async function loadHistory<T>(
  userId: string,
  tileId: string,
  file: string,
): Promise<T | null> {
  const db = await database();
  if (!db) return null;
  try {
    const record = await new Promise<{ print: string; history: T } | undefined>(
      (resolve, reject) => {
        const request = db
          .transaction(HISTORIES, "readonly")
          .objectStore(HISTORIES)
          .get(keyOf(userId, tileId));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );
    return record?.print === fingerprint(file) ? record.history : null;
  } catch {
    return null;
  }
}

const pending = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; run: () => void }
>();
let flushing = false;

export function keepHistory(
  userId: string,
  tileId: string,
  file: string,
  history: () => unknown,
) {
  const key = keyOf(userId, tileId);
  clearTimeout(pending.get(key)?.timer);
  const run = () => {
    pending.delete(key);
    void write(userId, key, fingerprint(file), history());
  };
  pending.set(key, { timer: setTimeout(run, DELAY), run });
  if (!flushing && typeof window !== "undefined") {
    flushing = true;
    window.addEventListener("pagehide", () => {
      for (const { timer, run } of [...pending.values()]) {
        clearTimeout(timer);
        run();
      }
    });
  }
}

async function write(
  userId: string,
  key: string,
  print: string,
  history: unknown,
) {
  const db = await database();
  if (!db) return;
  try {
    const tx = db.transaction([HISTORIES, META], "readwrite");
    tx.objectStore(HISTORIES).put({ print, history }, key);
    const meta = tx.objectStore(META);
    meta.put({ key, userId, savedAt: Date.now() } satisfies Meta);
    const all = meta.index("userId").getAll(userId);
    all.onsuccess = () => {
      const old = (all.result as Meta[])
        .sort((a, b) => b.savedAt - a.savedAt)
        .slice(KEEP);
      for (const item of old) {
        meta.delete(item.key);
        tx.objectStore(HISTORIES).delete(item.key);
      }
    };
  } catch {}
}
