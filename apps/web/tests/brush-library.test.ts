import { describe, expect, it } from "vitest";
import {
  MAX_BRUSHES,
  readBrushes,
  withBrush,
  writeBrushes,
} from "@/features/editor/brush-library";
import { patternColor } from "@/features/editor/pixel-canvas/paint";

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

const stamp = (w: number, h: number, value = 7) => ({
  w,
  h,
  pixels: new Uint8ClampedArray(w * h * 4).fill(value),
});

describe("brush library", () => {
  it("keeps each brush once, newest first, up to the limit", () => {
    const one = withBrush([], stamp(2, 2), "a");
    expect(withBrush(one, stamp(2, 2), "b")).toBe(one);
    const two = withBrush(one, stamp(3, 1), "b");
    expect(two.map((b) => b.id)).toEqual(["b", "a"]);
    expect(withBrush([], stamp(200, 2), "c")).toEqual([]);
    let many = one;
    for (let i = 0; i < 30; i++) many = withBrush(many, stamp(1, 1, i), `${i}`);
    expect(many).toHaveLength(MAX_BRUSHES);
  });
  it("stores brushes per person", () => {
    const storage = memoryStorage();
    writeBrushes("user-1", withBrush([], stamp(2, 3), "a"), storage);
    const [back] = readBrushes("user-1", storage);
    expect(back).toMatchObject({ id: "a", stamp: { w: 2, h: 3 } });
    expect([...back!.stamp.pixels]).toEqual(Array(24).fill(7));
    expect(readBrushes("user-2", storage)).toEqual([]);
    storage.setItem("pigxel:brushes:v1:user-3", "nonsense");
    expect(readBrushes("user-3", storage)).toEqual([]);
  });
  it("repeats a brush as a pattern fixed to the tile", () => {
    const texture = {
      w: 2,
      h: 1,
      pixels: new Uint8ClampedArray([1, 0, 0, 255, 2, 0, 0, 255]),
    };
    expect(patternColor(texture, 4, 9)[0]).toBe(1);
    expect(patternColor(texture, 5, 0)[0]).toBe(2);
    expect(patternColor(texture, -1, 0)[0]).toBe(2);
  });
});
