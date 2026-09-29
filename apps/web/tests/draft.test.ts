import { describe, expect, it } from "vitest";
import { DEFAULT_PEN } from "@/components/pixel-canvas/pen";
import {
  canStoreDrafts,
  createDraft,
  draftKey,
  findDraftFor,
  listDrafts,
  readDraft,
  readPen,
  removeDraft,
  writeDraft,
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

const tile = (name: string) => ({
  name,
  file: `{"format":"pigxel","name":"${name}"}`,
  location: null,
  dirty: true,
});

describe("tile drafts", () => {
  it("keeps each tile as its own draft", () => {
    const storage = memoryStorage();
    const grass = createDraft("user-1", tile("Grass"), storage)!;
    const water = createDraft("user-1", tile("Water"), storage)!;
    expect(grass.id).not.toBe(water.id);
    expect(readDraft("user-1", grass.id, storage)?.name).toBe("Grass");
    expect(readDraft("user-1", water.id, storage)?.name).toBe("Water");
    expect(
      listDrafts("user-1", storage)
        .map((d) => d.name)
        .sort(),
    ).toEqual(["Grass", "Water"]);
  });
  it("updates and removes one tile without touching the others", () => {
    const storage = memoryStorage();
    const grass = createDraft("user-1", tile("Grass"), storage)!;
    const water = createDraft("user-1", tile("Water"), storage)!;
    writeDraft("user-1", { ...grass, name: "Meadow", dirty: false }, storage);
    expect(readDraft("user-1", grass.id, storage)).toMatchObject({
      name: "Meadow",
      dirty: false,
    });
    removeDraft("user-1", water.id, storage);
    expect(listDrafts("user-1", storage).map((d) => d.name)).toEqual([
      "Meadow",
    ]);
  });
  it("keeps each person's drafts separate", () => {
    const storage = memoryStorage();
    const grass = createDraft("user-1", tile("Grass"), storage)!;
    expect(readDraft("user-2", grass.id, storage)).toBeNull();
    expect(listDrafts("user-2", storage)).toEqual([]);
    expect(draftKey("user-1", "a")).not.toBe(draftKey("user-2", "a"));
  });
  it("finds the draft of a tile that is already open", () => {
    const storage = memoryStorage();
    const cloud = createDraft(
      "user-1",
      {
        ...tile("Grass"),
        location: { kind: "cloud", tile: { id: "c1", name: "Grass" } },
      },
      storage,
    )!;
    expect(
      findDraftFor(
        "user-1",
        { kind: "cloud", tile: { id: "c1", name: "Grass" } },
        storage,
      )?.id,
    ).toBe(cloud.id);
    expect(
      findDraftFor(
        "user-1",
        { kind: "drive", file: { id: "c1", name: "Grass" } },
        storage,
      ),
    ).toBeNull();
  });
  it("carries over the single draft kept by earlier versions", () => {
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
    const [restored] = listDrafts("user-1", storage);
    expect(restored).toMatchObject({
      name: "Old",
      dirty: true,
      location: { kind: "drive", file: { id: "d", name: "Old.pigxel" } },
    });
    expect(readPen("user-1", storage).size).toBe(5);
    expect(storage.getItem("pigxel:draft:v1:user-1")).toBeNull();
  });
  it("ignores unreadable drafts", () => {
    const storage = memoryStorage();
    storage.setItem(draftKey("user-1", "bad"), "not json");
    storage.setItem(draftKey("user-1", "odd"), '{"name":1}');
    expect(listDrafts("user-1", storage)).toEqual([]);
    expect(readDraft("user-1", "missing", storage)).toBeNull();
  });
  it("reports when the browser refuses to store drafts", () => {
    const full = {
      ...memoryStorage(),
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    };
    expect(createDraft("user-1", tile("Grass"), full)).toBeNull();
    expect(writeDraft("user-1", { ...tile("G"), id: "x" }, undefined)).toBe(
      false,
    );
    expect(canStoreDrafts(full)).toBe(false);
    expect(canStoreDrafts(undefined)).toBe(false);
    const storage = memoryStorage();
    expect(canStoreDrafts(storage)).toBe(true);
    expect(storage.length).toBe(0);
  });
});
