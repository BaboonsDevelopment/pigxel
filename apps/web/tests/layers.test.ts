import { describe, expect, it } from "vitest";
import { blend } from "@/lib/layers/blend";
import { compositeOver, flatten } from "@/lib/layers/composite";
import {
  canPaint,
  createLayer,
  findLayer,
  insertLayer,
  isShown,
  moveLayer,
  nextName,
  panelRows,
  placeAbove,
  removeLayer,
  updateLayer,
} from "@/lib/layers/tree";
import type { GroupLayer, Layer } from "@/lib/layers/types";

const named = (kind: Layer["kind"], name: string) => ({
  ...createLayer(kind, name),
  id: name,
});

/** Background, A, Group(B, C), D — bottom to top. */
function sample(): Layer[] {
  const group = {
    ...(named("group", "G") as GroupLayer),
    children: [named("normal", "B"), named("normal", "C")],
  };
  return [
    named("background", "BG"),
    named("normal", "A"),
    group,
    named("normal", "D"),
  ];
}

const names = (tree: Layer[]) => panelRows(tree).map((r) => r.layer.name);

describe("layer tree", () => {
  it("lists layers top first, inside groups, closed groups folded", () => {
    const tree = sample();
    expect(names(tree)).toEqual(["D", "G", "C", "B", "A", "BG"]);
    expect(panelRows(tree).find((r) => r.layer.id === "C")).toMatchObject({
      depth: 1,
      parentId: "G",
      index: 1,
    });
    expect(names(updateLayer(tree, "G", { collapsed: true }))).toEqual([
      "D",
      "G",
      "A",
      "BG",
    ]);
  });
  it("moves layers up, down and into groups", () => {
    const tree = sample();
    expect(names(moveLayer(tree, "A", { parentId: null, index: 4 }))).toEqual([
      "A",
      "D",
      "G",
      "C",
      "B",
      "BG",
    ]);
    expect(names(moveLayer(tree, "D", { parentId: "G", index: 0 }))).toEqual([
      "G",
      "C",
      "B",
      "D",
      "A",
      "BG",
    ]);
    expect(names(moveLayer(tree, "C", { parentId: null, index: 1 }))).toEqual([
      "D",
      "G",
      "B",
      "A",
      "C",
      "BG",
    ]);
  });
  it("keeps the Background at the bottom and groups out of themselves", () => {
    const tree = sample();
    expect(moveLayer(tree, "BG", { parentId: null, index: 3 })).toBe(tree);
    expect(names(moveLayer(tree, "D", { parentId: null, index: 0 }))[5]).toBe(
      "BG",
    );
    expect(moveLayer(tree, "G", { parentId: "G", index: 0 })).toBe(tree);
  });
  it("inserts above a layer and removes a group with its contents", () => {
    const tree = sample();
    const added = insertLayer(
      tree,
      named("normal", "E"),
      placeAbove(tree, "B"),
    );
    expect(names(added)).toEqual(["D", "G", "C", "E", "B", "A", "BG"]);
    expect(names(removeLayer(tree, "G"))).toEqual(["D", "A", "BG"]);
    expect(findLayer(removeLayer(tree, "G"), "B")).toBeNull();
  });
  it("hides and locks through groups, and only draws on pixel layers", () => {
    const tree = updateLayer(sample(), "G", { visible: false });
    expect(isShown(tree, "B")).toBe(false);
    expect(canPaint(tree, "B")).toBe(false);
    expect(canPaint(tree, "A")).toBe(true);
    expect(canPaint(tree, "G")).toBe(false);
    expect(canPaint(updateLayer(tree, "A", { locked: true }), "A")).toBe(false);
  });
  it("numbers new layers after the highest one", () => {
    expect(
      nextName(
        [named("normal", "Layer 1"), named("normal", "Layer 7")],
        "normal",
      ),
    ).toBe("Layer 8");
    expect(nextName([], "group")).toBe("Group 1");
  });
});

describe("blending and compositing", () => {
  const px = (...values: number[]) => new Uint8ClampedArray(values);

  it("blends colours the way Aseprite does", () => {
    expect(blend("multiply", [0.5, 1, 0], [0.5, 0.5, 1])).toEqual([
      0.25, 0.5, 0,
    ]);
    expect(blend("screen", [0.5, 0, 1], [0.5, 0, 0])).toEqual([0.75, 0, 1]);
    expect(
      blend("difference", [0.2, 0.8, 0.5], [0.5, 0.5, 0.5])[0],
    ).toBeCloseTo(0.3);
    expect(blend("addition", [0.8, 0, 0], [0.5, 0, 0])).toEqual([1, 0, 0]);
    expect(blend("subtract", [0.8, 0, 0], [0.5, 0, 0])[0]).toBeCloseTo(0.3);
    // Luminosity keeps the backdrop's hue: grey stays grey.
    const grey = blend("luminosity", [0.5, 0.5, 0.5], [1, 0, 0]);
    expect(grey[0]).toBeCloseTo(grey[1]!);
  });
  it("paints over with opacity and keeps what is under transparency", () => {
    const dst = px(0, 0, 255, 255, 10, 20, 30, 255);
    compositeOver(dst, px(255, 0, 0, 255, 0, 0, 0, 0), 128, "normal");
    expect([...dst]).toEqual([128, 0, 127, 255, 10, 20, 30, 255]);
  });
  it("shows a layer as is where nothing is below, whatever its mode", () => {
    const dst = px(0, 0, 0, 0);
    compositeOver(dst, px(200, 100, 50, 255), 255, "multiply");
    expect([...dst]).toEqual([200, 100, 50, 255]);
  });
  it("flattens bottom to top, skipping hidden layers and chosen kinds", () => {
    const tree = sample();
    const colours: Record<string, number[]> = {
      BG: [255, 255, 255, 255],
      A: [255, 0, 0, 255],
      B: [0, 255, 0, 255],
      C: [0, 0, 0, 0],
      D: [0, 0, 0, 0],
    };
    const pixelsOf = (id: string) =>
      colours[id] ? px(...colours[id]!) : undefined;
    expect([...flatten(tree, pixelsOf, 4)]).toEqual([0, 255, 0, 255]);
    const hidden = updateLayer(tree, "G", { visible: false });
    expect([...flatten(hidden, pixelsOf, 4)]).toEqual([255, 0, 0, 255]);
    expect([...flatten(hidden, pixelsOf, 4, ["background", "normal"])]).toEqual(
      [0, 0, 0, 0],
    );
  });
});
