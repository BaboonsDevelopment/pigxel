import { describe, expect, it } from "vitest";
import {
  movedTab,
  readTabs,
  tabAfterClosing,
  withTab,
  withoutTab,
  writeTabs,
} from "@/lib/pigxel-file/tabs";

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

describe("editor tabs", () => {
  it("opens a tile once, next to the one it was opened from", () => {
    expect(withTab(["a", "b"], "c")).toEqual(["a", "b", "c"]);
    expect(withTab(["a", "b"], "c", "a")).toEqual(["a", "c", "b"]);
    expect(withTab(["a", "b"], "a", "b")).toEqual(["a", "b"]);
    expect(withTab(["a"], "c", "missing")).toEqual(["a", "c"]);
  });
  it("closes and moves tabs", () => {
    expect(withoutTab(["a", "b", "c"], "b")).toEqual(["a", "c"]);
    expect(movedTab(["a", "b", "c"], "a", 2)).toEqual(["b", "c", "a"]);
    expect(movedTab(["a", "b", "c"], "c", 0)).toEqual(["c", "a", "b"]);
    expect(movedTab(["a", "b", "c"], "b", 9)).toEqual(["a", "c", "b"]);
  });
  it("shows the next tab after closing one, else the one before", () => {
    expect(tabAfterClosing(["a", "b", "c"], "b")).toBe("c");
    expect(tabAfterClosing(["a", "b", "c"], "c")).toBe("b");
    expect(tabAfterClosing(["a"], "a")).toBeNull();
    expect(tabAfterClosing(["a"], "x")).toBeNull();
  });
  it("keeps each person's tabs", () => {
    const storage = memoryStorage();
    writeTabs("user-1", ["a", "b"], storage);
    expect(readTabs("user-1", storage)).toEqual(["a", "b"]);
    expect(readTabs("user-2", storage)).toEqual([]);
    storage.setItem("pigxel:tabs:v1:user-3", "not json");
    expect(readTabs("user-3", storage)).toEqual([]);
  });
});
