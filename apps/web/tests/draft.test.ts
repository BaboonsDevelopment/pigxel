import { describe, expect, it } from "vitest";
import { DEFAULT_PEN } from "@/components/pixel-canvas/pen";
import {
  canStoreDrafts,
  createDraft,
  draftKey,
  findDraftFor,
  listDrafts,
  moveToIndexedDb,
  readDraft,
  readPen,
  removeDraft,
  startDrafts,
  storageBackend,
  writeDraft,
  type Draft,
  type DraftBackend,
} from "@/lib/pigxel-file/draft";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
}

function memoryBackend(): DraftBackend & { items: Map<string, Draft> } {
  const items = new Map<string, Draft>();
  return {
    items,
    all: async (userId) =>
      [...items.entries()]
        .filter(([key]) => key.startsWith(draftKey(userId, "")))
        .map(([, draft]) => draft),
    put: async (userId, draft) =>
      void items.set(draftKey(userId, draft.id), draft),
    remove: async (userId, id) => void items.delete(draftKey(userId, id)),
  };
}

const tile = (name: string) => ({
  name,
  file: `{"format":"pigxel","name":"${name}"}`,
  location: null,
  dirty: true,
});

describe("tile drafts", () => {
  it("keeps each tile as its own draft", async () => {
    await startDrafts("user-1", storageBackend(memoryStorage()));
    const grass = createDraft("user-1", tile("Grass"))!;
    const water = createDraft("user-1", tile("Water"))!;
    expect(grass.id).not.toBe(water.id);
    expect(readDraft("user-1", grass.id)?.name).toBe("Grass");
    expect(readDraft("user-1", water.id)?.name).toBe("Water");
    expect(
      listDrafts("user-1")
        .map((d) => d.name)
        .sort(),
    ).toEqual(["Grass", "Water"]);
  });
  it("updates and removes one tile without touching the others", async () => {
    await startDrafts("user-1", storageBackend(memoryStorage()));
    const grass = createDraft("user-1", tile("Grass"))!;
    const water = createDraft("user-1", tile("Water"))!;
    writeDraft("user-1", { ...grass, name: "Meadow", dirty: false });
    expect(readDraft("user-1", grass.id)).toMatchObject({
      name: "Meadow",
      dirty: false,
    });
    removeDraft("user-1", water.id);
    expect(listDrafts("user-1").map((d) => d.name)).toEqual(["Meadow"]);
  });
  it("keeps drafts for the next page", async () => {
    const backend = memoryBackend();
    await startDrafts("user-1", backend);
    const grass = createDraft("user-1", tile("Grass"))!;
    removeDraft("user-1", createDraft("user-1", tile("Water"))!.id);
    await Promise.resolve();
    await startDrafts("user-1", backend);
    expect(listDrafts("user-1").map((d) => d.id)).toEqual([grass.id]);
  });
  it("keeps each person's drafts separate", async () => {
    const storage = memoryStorage();
    await startDrafts("user-1", storageBackend(storage));
    const grass = createDraft("user-1", tile("Grass"))!;
    expect(readDraft("user-2", grass.id)).toBeNull();
    await startDrafts("user-2", storageBackend(storage));
    expect(listDrafts("user-2")).toEqual([]);
    expect(draftKey("user-1", "a")).not.toBe(draftKey("user-2", "a"));
  });
  it("finds the draft of a tile that is already open", async () => {
    await startDrafts("user-1", memoryBackend());
    const cloud = createDraft("user-1", {
      ...tile("Grass"),
      location: { kind: "cloud", tile: { id: "c1", name: "Grass" } },
    })!;
    expect(
      findDraftFor("user-1", {
        kind: "cloud",
        tile: { id: "c1", name: "Grass" },
      })?.id,
    ).toBe(cloud.id);
    expect(
      findDraftFor("user-1", {
        kind: "drive",
        file: { id: "c1", name: "Grass" },
      }),
    ).toBeNull();
  });
  it("moves drafts from localStorage to IndexedDB, freeing localStorage", async () => {
    const storage = memoryStorage();
    await startDrafts("user-1", storageBackend(storage));
    createDraft("user-1", tile("Grass"));
    createDraft("user-1", tile("Water"));
    const indexed = memoryBackend();
    await moveToIndexedDb("user-1", storage, indexed);
    expect(storage.length).toBe(0);
    await startDrafts("user-1", indexed);
    expect(
      listDrafts("user-1")
        .map((d) => d.name)
        .sort(),
    ).toEqual(["Grass", "Water"]);
  });
  it("carries over the single draft kept by earlier versions", async () => {
    const storage = memoryStorage();
    storage.setItem(
      "pigxel:draft:v1:user-1",
      JSON.stringify({
        name: "Old",
        file: "{}",
        dirty: true,
        driveFile: { id: "d", name: "Old.pigxel" },
        pen: { ...DEFAULT_PEN, size: 5 },
      }),
    );
    await startDrafts("user-1", storageBackend(storage));
    const [restored] = listDrafts("user-1");
    expect(restored).toMatchObject({
      name: "Old",
      dirty: true,
      location: { kind: "drive", file: { id: "d", name: "Old.pigxel" } },
    });
    expect(readPen("user-1", storage).size).toBe(5);
    expect(storage.getItem("pigxel:draft:v1:user-1")).toBeNull();
  });
  it("ignores unreadable drafts", async () => {
    const storage = memoryStorage();
    storage.setItem(draftKey("user-1", "bad"), "not json");
    storage.setItem(draftKey("user-1", "odd"), '{"name":1}');
    await startDrafts("user-1", storageBackend(storage));
    expect(listDrafts("user-1")).toEqual([]);
    expect(readDraft("user-1", "missing")).toBeNull();
  });
  it("reports when the browser refuses to store drafts", async () => {
    const full = {
      ...memoryStorage(),
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    };
    await startDrafts("user-1", storageBackend(full));
    expect(createDraft("user-1", tile("Grass"))).toBeNull();
    expect(listDrafts("user-1")).toEqual([]);
    await startDrafts("user-1", null);
    expect(writeDraft("user-1", { ...tile("G"), id: "x" })).toBe(false);
    expect(canStoreDrafts("user-1")).toBe(false);
    await startDrafts("user-1", memoryBackend());
    expect(canStoreDrafts("user-1")).toBe(true);
  });
});
