import { describe, expect, it } from "vitest";
import { describeStep } from "@/features/editor/pixel-canvas/history-steps";
import { createLayer } from "@/lib/layers/tree";

const layer = { ...createLayer("normal", "Hero"), id: "l" };
const frames = [
  { id: "a", duration: 100 },
  { id: "b", duration: 100 },
];
const pixels = new Uint8ClampedArray(4);
const step = {
  tree: [layer],
  frames,
  cels: new Map([
    ["a", new Map([["l", pixels]])],
    ["b", new Map()],
  ]),
  size: { w: 1, h: 1 },
  tags: [],
  links: [],
  celSettings: [],
  palette: ["#000000"],
  slices: [],
  colorMode: "rgb",
  pixelRatio: { w: 1, h: 1 },
  background: "transparent",
};

describe("history step names", () => {
  it("names drawing by layer and frame", () => {
    const next = {
      ...step,
      cels: new Map([
        ["a", new Map([["l", new Uint8ClampedArray(4)]])],
        ["b", new Map()],
      ]),
    };
    expect(describeStep(step, next)).toBe("Draw on “Hero”, frame 1");
  });
  it("names layers, frames and the palette", () => {
    const other = { ...createLayer("normal", "Sky"), id: "s" };
    expect(describeStep(step, { ...step, tree: [layer, other] })).toBe(
      "Add “Sky”",
    );
    expect(
      describeStep(step, {
        ...step,
        frames: [...frames, { id: "c", duration: 1 }],
      }),
    ).toBe("Add a frame");
    expect(
      describeStep(step, {
        ...step,
        frames: frames.map((f) => ({ ...f, duration: 50 })),
      }),
    ).toBe("Change frame timing");
    expect(
      describeStep(step, { ...step, palette: ["#ffffff"], links: [] }),
    ).toBe("Change the palette");
  });
});
