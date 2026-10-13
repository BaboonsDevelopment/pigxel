import { describe, expect, it } from "vitest";
import { flatten } from "@/lib/layers/composite";
import { lockedAlpha } from "@/lib/layers/alpha-lock";
import { createLayer, moveLayers } from "@/lib/layers/tree";
import type { Layer } from "@/lib/layers/types";

const px = (...values: number[]) => new Uint8ClampedArray(values);
const layer = (name: string, extra: Partial<Layer> = {}) =>
  ({ ...createLayer("normal", name), id: name, ...extra }) as Layer;

describe("layer masks and clipping", () => {
  it("hides the layer below where the mask is black", () => {
    const tree = [layer("art"), layer("mask", { mask: true })];
    const cels: Record<string, Uint8ClampedArray> = {
      art: px(255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255),
      mask: px(0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0),
    };
    const out = flatten(tree, (id) => cels[id], 12);
    expect([out[3], out[7], out[11]]).toEqual([0, 255, 255]);
  });
  it("shows a clipped layer only inside the layer below", () => {
    const tree = [layer("base"), layer("shade", { clip: true })];
    const cels: Record<string, Uint8ClampedArray> = {
      base: px(0, 0, 255, 255, 0, 0, 0, 0),
      shade: px(255, 0, 0, 255, 255, 0, 0, 255),
    };
    expect([...flatten(tree, (id) => cels[id], 8)]).toEqual([
      255, 0, 0, 255, 0, 0, 0, 0,
    ]);
  });
  it("draws a reference above the art when asked", () => {
    const tree = [
      { ...layer("ref"), kind: "reference", above: true } as Layer,
      layer("art"),
    ];
    const cels: Record<string, Uint8ClampedArray> = {
      ref: px(0, 255, 0, 255),
      art: px(255, 0, 0, 255),
    };
    expect([...flatten(tree, (id) => cels[id], 4)]).toEqual([0, 255, 0, 255]);
  });
});

describe("transparent pixel lock", () => {
  it("recolours drawn pixels but keeps empty ones empty", () => {
    const before = px(10, 10, 10, 128, 0, 0, 0, 0, 20, 20, 20, 255);
    const after = px(200, 0, 0, 255, 200, 0, 0, 255, 0, 0, 0, 0);
    expect([...lockedAlpha(before, after)]).toEqual([
      200, 0, 0, 128, 0, 0, 0, 0, 20, 20, 20, 255,
    ]);
  });
});

describe("moving several layers", () => {
  it("keeps their order and lands them at the drop place", () => {
    const tree = ["a", "b", "c", "d"].map((name) => layer(name));
    const moved = moveLayers(tree, ["a", "c"], { parentId: null, index: 4 });
    expect(moved.map((l) => l.id)).toEqual(["b", "d", "a", "c"]);
  });
});
