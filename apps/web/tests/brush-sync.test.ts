import { describe, expect, it } from "vitest";
import {
  decodeBrushRecord,
  encodeBrushRecord,
  mergeBrushRecords,
  visibleBrushes,
  type BrushRecord,
} from "@/features/editor/brush-sync";

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
