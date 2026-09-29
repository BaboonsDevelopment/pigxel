import { describe, expect, it } from "vitest";
import { drawnBox, follow } from "@/components/chat-panel/helpers";
import {
  GEMINI_ASPECT_RATIOS,
  MAX_FRAMES,
  MAX_TRACKS,
  OPENAI_IMAGE_SIZES,
} from "@/lib/ai/constants";
import { clampAnimationPlan, sheetLayout } from "@/lib/ai/helpers";
import type { AnimationReply } from "@/lib/ai/types";
import type { Bitmap } from "@/lib/image/bitmap";
import { posesToFrames, splitSheet } from "@/lib/image/sheet";

/** A `w × h` bitmap with an opaque `color` rectangle at `x`, `y`. */
function drawing(
  w: number,
  h: number,
  rects: { x: number; y: number; w: number; h: number }[],
  color = [200, 40, 40, 255],
): Bitmap {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (const r of rects)
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) rgba.set(color, (y * w + x) * 4);
  return { rgba, w, h };
}

describe("sprite sheet layout", () => {
  const openai = Object.keys(OPENAI_IMAGE_SIZES);

  it("fits every frame in a grid of a shape the image model can draw", () => {
    for (const ratios of [openai, GEMINI_ASPECT_RATIOS])
      for (const count of [1, 2, 4, 6, 8, 12]) {
        const layout = sheetLayout(count, 32, 32, ratios);
        expect(layout.cols * layout.rows).toBeGreaterThanOrEqual(count);
        expect(ratios).toContain(layout.aspectRatio);
      }
    expect(sheetLayout(4, 32, 32, openai)).toMatchObject({ cols: 2, rows: 2 });
    expect(sheetLayout(3, 16, 48, GEMINI_ASPECT_RATIOS)).toMatchObject({
      cols: 3,
      rows: 1,
    });
    // Only square, landscape and portrait: six square frames fill a 2:3 grid exactly.
    const six = sheetLayout(6, 32, 32, openai);
    expect(six.cols * six.rows).toBe(6);
    expect(["2:3", "3:2"]).toContain(six.aspectRatio);
  });
});

describe("animation plan", () => {
  const sheet = {
    kind: "sheet",
    name: "Monkey",
    subject: "a brown monkey holding a grenade",
    reuse: -1,
    box: { x: 2, y: 4, w: 40, h: 40 },
    poses: ["wind up", "throw", "follow through"],
    path: [],
  };
  const prop = {
    kind: "prop",
    name: "Grenade",
    subject: "a small green grenade",
    reuse: -1,
    box: { x: 0, y: 0, w: 6, h: 6 },
    poses: [],
    path: [
      { x: 0, y: 0, w: 6, h: 6, visible: false },
      { x: 30, y: 10, w: 6, h: 6, visible: true },
      { x: 60, y: 90, w: 6, h: 6, visible: true },
    ],
  };
  const reply = (
    patch: Partial<AnimationReply> = {},
  ): Partial<AnimationReply> => ({
    name: "Monkey Throws Grenade",
    frameCount: 3,
    duration: 90,
    summary: "The monkey throws the grenade.",
    tracks: [sheet, prop],
    ...patch,
  });

  it("keeps boxes in the tile and gives one pose and place per frame", () => {
    const plan = clampAnimationPlan(reply(), 32, 32, 0, 0);
    expect(plan.frameCount).toBe(3);
    const [monkey, grenade] = plan.tracks;
    expect(monkey).toMatchObject({ kind: "sheet", reuse: null });
    if (monkey?.kind !== "sheet") throw new Error("expected a sheet");
    expect(monkey.box.x + monkey.box.w).toBeLessThanOrEqual(32);
    expect(monkey.poses).toHaveLength(3);
    if (grenade?.kind !== "prop") throw new Error("expected a prop");
    expect(grenade.path[0]).toBeNull();
    expect(grenade.path[2]!.x + grenade.path[2]!.w).toBeLessThanOrEqual(32);
  });
  it("follows the frame count asked for and stays within limits", () => {
    const plan = clampAnimationPlan(reply(), 64, 64, 0, 5);
    expect(plan.frameCount).toBe(5);
    expect(plan.tracks[0]).toMatchObject({ poses: [...sheet.poses, "", ""] });
    expect(
      clampAnimationPlan(reply({ frameCount: 99 }), 64, 64, 0, 0).frameCount,
    ).toBe(MAX_FRAMES);
    const many = clampAnimationPlan(
      reply({ tracks: [sheet, sheet, sheet, sheet, prop] }),
      64,
      64,
      0,
      0,
    );
    expect(many.tracks).toHaveLength(MAX_TRACKS);
  });
  it("drops tracks with nothing to show and reuses only existing layers", () => {
    const hidden = {
      ...prop,
      path: prop.path.map((r) => ({ ...r, visible: false })),
    };
    const plan = clampAnimationPlan(
      reply({
        tracks: [{ ...sheet, reuse: 1 }, hidden, { ...sheet, subject: "" }],
      }),
      64,
      64,
      2,
      0,
    );
    expect(plan.tracks).toHaveLength(1);
    expect(plan.tracks[0]).toMatchObject({ reuse: 1 });
    expect(
      clampAnimationPlan(
        reply({ tracks: [{ ...sheet, reuse: 5 }] }),
        64,
        64,
        2,
        0,
      ).tracks[0],
    ).toMatchObject({ reuse: null });
  });
});

describe("sprite sheet to frames", () => {
  it("gives each cell its own pose, even one reaching past the cell", () => {
    // Three cells of about 13px; the second pose reaches into the first, the third is empty.
    const sheet = drawing(40, 20, [
      { x: 4, y: 6, w: 8, h: 10 },
      { x: 18, y: 2, w: 12, h: 14 },
    ]);
    const poses = splitSheet(sheet, { cols: 3, rows: 1 }, 3);
    expect(poses.map((p) => p && [p.w, p.h])).toEqual([
      [8, 10],
      [12, 14],
      null,
    ]);
  });
  it("shrinks every pose by the same factor and stands it on the bottom edge", () => {
    const poses = [
      drawing(20, 20, [{ x: 0, y: 0, w: 20, h: 20 }]),
      null,
      drawing(8, 8, [{ x: 0, y: 0, w: 8, h: 8 }]),
    ];
    const frames = posesToFrames(poses, { w: 10, h: 10 });
    expect(frames[1]).toBeNull();
    const box = (f: Bitmap) => drawnBox(f.rgba, f);
    expect(box(frames[0]!)).toEqual({ x: 0, y: 0, w: 10, h: 10 });
    // Shrunk by the same half as the first (8px to 4px), centred, on the bottom.
    expect(box(frames[2]!)).toEqual({ x: 3, y: 6, w: 4, h: 4 });
  });
});

describe("edits across frames", () => {
  it("moves and scales another frame's drawing like the planned one", () => {
    const size = { w: 64, h: 64 };
    const source = { x: 10, y: 10, w: 10, h: 10 };
    const target = { x: 20, y: 10, w: 20, h: 20 };
    expect(
      follow({ x: 12, y: 10, w: 10, h: 10 }, source, target, size),
    ).toEqual({
      x: 24,
      y: 10,
      w: 20,
      h: 20,
    });
    // Kept inside the tile.
    expect(
      follow({ x: 50, y: 50, w: 10, h: 10 }, source, target, size),
    ).toEqual({
      x: 44,
      y: 44,
      w: 20,
      h: 20,
    });
  });
});
