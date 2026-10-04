import { describe, expect, it } from "vitest";
import {
  createLayer,
  flattenTargets,
  layerBelow,
  withoutLayers,
} from "@/lib/layers/tree";
import type { GroupLayer, Layer } from "@/lib/layers/types";

const named = (kind: Layer["kind"], name: string, visible = true) => ({
  ...createLayer(kind, name),
  id: name,
  visible,
});

function sample(): Layer[] {
  const group = {
    ...(named("group", "G") as GroupLayer),
    children: [named("normal", "B"), named("normal", "C", false)],
  };
  return [
    named("background", "BG"),
    named("reference", "R"),
    group,
    named("normal", "D"),
  ];
}

describe("merge and flatten", () => {
  it("finds the layer directly below in the same group", () => {
    expect(layerBelow(sample(), "D")?.id).toBe("G");
    expect(layerBelow(sample(), "C")?.id).toBe("B");
    expect(layerBelow(sample(), "B")).toBeNull();
  });
  it("flattens visible layers only, never references", () => {
    expect(flattenTargets(sample(), true)).toEqual(["BG", "B", "D"]);
    expect(flattenTargets(sample(), false)).toEqual(["BG", "B", "C", "D"]);
  });
  it("hides layers under a hidden group", () => {
    const tree = sample();
    tree[2] = { ...tree[2]!, visible: false };
    expect(flattenTargets(tree, true)).toEqual(["BG", "D"]);
  });
  it("drops groups left empty", () => {
    const left = withoutLayers(sample(), new Set(["BG", "B", "C", "D"]));
    expect(left.map((l) => l.id)).toEqual(["R"]);
    const kept = withoutLayers(sample(), new Set(["B", "D"]));
    expect(kept.map((l) => l.id)).toEqual(["BG", "R", "G"]);
  });
});
