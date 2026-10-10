import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT, movePanel } from "@/features/editor/layout";
import {
  mergePresets,
  presetLayout,
  readPresets,
} from "@/features/editor/layout-presets";

describe("layout presets", () => {
  it("provides distinct workspaces with the relevant panels visible", () => {
    expect(presetLayout("Drawing").hidden).toContain("timeline");
    expect(presetLayout("Animation").hidden).not.toContain("timeline");
    expect(presetLayout("Tiles").hidden).not.toContain("tileset");
    const drawing = presetLayout("Drawing");
    drawing.docks.left.stacks[0]!.size = 500;
    expect(presetLayout("Drawing").docks.left.stacks[0]!.size).toBe(112);
    expect(DEFAULT_LAYOUT.docks.left.stacks[0]!.size).toBe(112);
  });
  it("round trips floating panels, sizes, tools and tabs in named presets", () => {
    const layout = movePanel(DEFAULT_LAYOUT, "palette", {
      kind: "float",
      rect: { x: 20, y: 30, w: 400, h: 250 },
    });
    const saved = readPresets(
      JSON.parse(
        JSON.stringify({
          Drawing: {
            layout: {
              ...layout,
              hiddenTools: ["pen"],
              groupTools: { brush: "brush" },
              heights: { colors: 150 },
            },
            updatedAt: 10,
          },
        }),
      ),
    );
    expect(saved.Drawing?.layout.floating.palette).toEqual({
      x: 20,
      y: 30,
      w: 400,
      h: 250,
    });
    expect(saved.Drawing?.layout.hiddenTools).toEqual(["pen"]);
    expect(saved.Drawing?.layout.heights.colors).toBe(150);
  });
  it("merges each slot by timestamp without replacing a newer local save", () => {
    const older = { layout: presetLayout("Drawing"), updatedAt: 10 };
    const newer = { layout: presetLayout("Tiles"), updatedAt: 20 };
    expect(
      mergePresets({ Drawing: newer }, { Drawing: older, Tiles: older }),
    ).toEqual({ Drawing: newer, Tiles: older });
    expect(mergePresets({ Drawing: older }, { Drawing: newer }).Drawing).toBe(
      newer,
    );
  });
  it("ignores invalid slots and timestamps", () => {
    expect(
      readPresets({
        Drawing: { layout: DEFAULT_LAYOUT, updatedAt: "bad" },
        Unknown: { layout: DEFAULT_LAYOUT, updatedAt: 10 },
      }),
    ).toEqual({});
    expect(readPresets(null)).toEqual({});
  });
});
