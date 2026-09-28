import { describe, expect, it } from "vitest";
import { DEFAULT_PEN } from "@/components/pixel-canvas/pen";
import {
  canStoreDrafts,
  draftKey,
  readDraft,
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

const draft = {
  name: "Grass",
  file: '{"format":"pigxel"}',
  driveFile: { id: "drive-1", name: "Grass.pigxel" },
  dirty: true,
  pen: DEFAULT_PEN,
};

describe("tile drafts", () => {
  it("saves and restores the tile with its timestamp", () => {
    const storage = memoryStorage();
    expect(writeDraft("user-1", draft, storage)).toBe(true);
    expect(readDraft("user-1", storage)).toMatchObject(draft);
    expect(readDraft("user-1", storage)?.savedAt).toBeTypeOf("number");
  });
  it("keeps each person's draft separate", () => {
    const storage = memoryStorage();
    writeDraft("user-1", draft, storage);
    expect(readDraft("user-2", storage)).toBeNull();
    expect(draftKey("user-1")).not.toBe(draftKey("user-2"));
  });
  it("ignores missing or unreadable drafts", () => {
    const storage = memoryStorage();
    expect(readDraft("user-1", storage)).toBeNull();
    storage.setItem(draftKey("user-1"), "not json");
    expect(readDraft("user-1", storage)).toBeNull();
    storage.setItem(draftKey("user-1"), '{"name":1}');
    expect(readDraft("user-1", storage)).toBeNull();
  });
  it("reports when the browser refuses to store it", () => {
    const full = {
      ...memoryStorage(),
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    };
    expect(writeDraft("user-1", draft, full)).toBe(false);
    expect(writeDraft("user-1", draft, undefined)).toBe(false);
    expect(canStoreDrafts(full)).toBe(false);
    expect(canStoreDrafts(undefined)).toBe(false);
    const storage = memoryStorage();
    expect(canStoreDrafts(storage)).toBe(true);
    expect(storage.length).toBe(0);
  });
});
