import { describe, expect, it } from "vitest";
import {
  MAX_BRUSHES,
  readBrushes,
  withBrush,
  writeBrushes,
} from "@/features/editor/brush-library";
import { patternColor } from "@/features/editor/pixel-canvas/paint";
import {
  decodeBrushRecord,
  encodeBrushRecord,
  mergeBrushRecords,
  visibleBrushes,
  type BrushRecord,
} from "@/features/editor/brush-sync";

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

const brush = (id: string, updatedAt: number): BrushRecord => ({
  id,
  updatedAt,
  brush: {
    id,
    stamp: { w: 1, h: 1, pixels: new Uint8ClampedArray([10, 20, 30, 255]) },
  },
});
describe("account picture brushes", () => {
  it("round trips encoded pixel data and tombstones", () => {
    const record = brush("one", 100);
    expect(decodeBrushRecord(encodeBrushRecord(record))).toEqual(record);
    const deleted = { id: "one", brush: null, updatedAt: 200 };
    expect(decodeBrushRecord(encodeBrushRecord(deleted))).toEqual(deleted);
  });
  it("merges additions on different devices", () => {
    const merged = mergeBrushRecords([brush("one", 10)], [brush("two", 20)]);
    expect(visibleBrushes(merged).map((entry) => entry.id)).toEqual([
      "two",
      "one",
    ]);
  });
  it("does not restore a deleted brush from an old offline or legacy copy", () => {
    const deleted = { id: "one", brush: null, updatedAt: 200 };
    expect(
      visibleBrushes(mergeBrushRecords([deleted], [brush("one", 10)])),
    ).toEqual([]);
    expect(
      visibleBrushes(mergeBrushRecords([brush("one", 1)], [deleted])),
    ).toEqual([]);
  });
  it("preserves a newer offline save when loading older cloud data", () => {
    expect(
      mergeBrushRecords([brush("one", 200)], [brush("one", 100)])[0]?.updatedAt,
    ).toBe(200);
  });
  it("rejects malformed dimensions, pixels and timestamps", () => {
    const encoded = encodeBrushRecord(brush("one", 100));
    expect(decodeBrushRecord({ ...encoded, updatedAt: NaN })).toBeNull();
    expect(
      decodeBrushRecord({ ...encoded, brush: { ...encoded.brush, w: 129 } }),
    ).toBeNull();
    expect(
      decodeBrushRecord({
        ...encoded,
        brush: { ...encoded.brush, pixels: "!" },
      }),
    ).toBeNull();
    expect(
      decodeBrushRecord({
        ...encoded,
        brush: { ...encoded.brush, id: "different" },
      }),
    ).toBeNull();
  });
});
