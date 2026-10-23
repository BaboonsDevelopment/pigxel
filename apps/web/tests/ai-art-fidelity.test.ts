import { describe, expect, it } from "vitest";
import {
  buildImagePrompt,
  buildRedrawReferences,
  buildSheetPrompt,
  buildSheetRedrawPrompt,
  clampAnimationPlan,
} from "@/features/ai/helpers";
import { readRoute } from "@/features/ai/replies";
import { referencesForAction } from "@/features/ai/chat/references";
import {
  IMAGE_BACKGROUND_RULES,
  IMAGE_STYLE_RULES,
} from "@/features/ai/constants";
import { cutOutBackground } from "@/lib/image/steps/cut-out-background";
import { shrinkToTile } from "@/lib/image/steps/shrink-to-tile";
import {
  SCENE_PICTURE_STEPS,
  REDRAWN_PICTURE_STEPS,
  runSteps,
} from "@/lib/image/pipeline";
import { sheetCells, posesToFrames } from "@/lib/image/sheet";
import type { Bitmap } from "@/lib/image/bitmap";
import { applyRedraw } from "@/features/ai/components/chat-panel/helpers";

const bitmap = (w: number, h: number, color = [0, 0, 0, 0]): Bitmap => ({
  w,
  h,
  rgba: new Uint8ClampedArray(
    Array.from({ length: w * h }, () => color).flat(),
  ),
});
const put = (b: Bitmap, x: number, y: number, color: number[]) =>
  b.rgba.set(color, (y * b.w + x) * 4);
const alpha = (b: Bitmap, x: number, y: number) =>
  b.rgba[(y * b.w + x) * 4 + 3];

describe("requested composition and style", () => {
  it("does not impose RPG proportions or shading when matching an image without a named style", () => {
    const prompt = buildImagePrompt(
      "the corgi, identical to the attached example",
      64,
      64,
      true,
    );
    expect(prompt).not.toContain("not cartoonish");
    expect(prompt).not.toContain("not chibi");
    expect(prompt).not.toContain("Rich hand-placed shading");
    expect(prompt).toContain("pose, viewing angle, proportions");
    expect(prompt).toContain(IMAGE_BACKGROUND_RULES[0]);
  });
  it("gives a newly requested pose and style priority over both previous renderings", () => {
    const prompt = buildRedrawReferences("the current corgi", true, 1);
    expect(prompt).toContain("lower priority than the latest request");
    expect(prompt).toContain("overriding the current and original images");
  });
  it("keeps a reference for a follow-up edit but not an unrelated new subject", () => {
    const messages = [
      {
        role: "user" as const,
        content: "match this",
        references: ["corgi-reference"],
      },
      { role: "assistant" as const, content: "done" },
      { role: "user" as const, content: "use the same pose" },
    ];
    expect(
      referencesForAction(messages, { kind: "edit", request: "same pose" }),
    ).toEqual(["corgi-reference"]);
    expect(
      referencesForAction(messages, {
        kind: "generate",
        request: "a lighthouse",
      }),
    ).toEqual([]);
    expect(
      referencesForAction(
        [
          ...messages,
          {
            role: "user",
            content: "a lighthouse",
            action: { kind: "generate", request: "a lighthouse" },
          },
          { role: "user", content: "blue roof" },
        ],
        { kind: "edit", request: "blue roof" },
      ),
    ).toEqual([]);
  });
  it("keeps the existing default sprite style and chroma-key background", () => {
    const prompt = buildImagePrompt("a fox", 64, 64);
    for (const rule of IMAGE_STYLE_RULES) expect(prompt).toContain(rule);
  });
  it("uses the explicit style without conflicting default RPG instructions", () => {
    const prompt = buildImagePrompt(
      "a fox",
      64,
      64,
      true,
      "sprite",
      "cute flat chibi, pastel colours",
    );
    expect(prompt).toContain("cute flat chibi, pastel colours");
    expect(prompt).not.toContain("not chibi");
    expect(prompt).not.toContain("classic 16-bit");
    expect(prompt).toContain(IMAGE_BACKGROUND_RULES[0]);
  });
  it("preserves a requested scene and its background without chroma-key commands", () => {
    const prompt = buildImagePrompt(
      "a fox in a snowy forest",
      64,
      64,
      true,
      "scene",
    );
    expect(prompt).toContain("snowy forest");
    expect(prompt).toContain("edge-to-edge");
    expect(prompt).not.toContain(IMAGE_BACKGROUND_RULES[0]);
    expect(prompt).not.toContain("no scenery");
  });
  it("keeps a complete scene together even if the router lists separate items", () => {
    const route = readRoute(
      JSON.stringify({
        intent: "generate",
        subject: "fox in forest",
        composition: "scene",
        style: "watercolor",
        items: [{ subject: "fox", name: "Fox" }],
      }),
      "draw a scene",
    );
    expect(route.composition).toBe("scene");
    expect(route.style).toBe("watercolor");
    expect(route.items).toEqual([]);
  });
  it("respects style and background for new animation sheets too", () => {
    const prompt = buildSheetPrompt({
      subject: "a snowy forest",
      poses: ["snow falls", "snow settles"],
      cellW: 64,
      cellH: 64,
      layout: { cols: 2, rows: 1, aspectRatio: "2:1" },
      fromReference: false,
      composition: "scene",
      style: "chibi pastel",
    });
    expect(prompt).toContain("chibi pastel");
    expect(prompt).not.toContain("not chibi");
    expect(prompt).not.toContain(IMAGE_BACKGROUND_RULES[0]);
  });
  it("does not overwrite a turning animation with frame one's viewing direction", () => {
    const prompt = buildSheetRedrawPrompt({
      instruction: "make skin blue",
      count: 6,
      cellW: 64,
      cellH: 64,
      layout: { cols: 3, rows: 2, aspectRatio: "3:2" },
    });
    expect(prompt).toContain("KEEP its original pose, viewing direction");
    expect(prompt).not.toContain("same side it is seen from");
    expect(prompt).not.toContain("no scenery");
  });
});

describe("thin details and complete frames", () => {
  it("applies subtle recolouring to the entire material, including nearby shades", () => {
    const before = bitmap(4, 4, [100, 80, 60, 255]);
    const after = bitmap(4, 4, [110, 95, 75, 255]);
    const result = applyRedraw(
      before.rgba,
      before,
      after,
      { x: 0, y: 0, w: 4, h: 4 },
      [],
    );
    expect(result).toEqual(after.rgba);
  });
  it("retains a one-pixel bowstring when removing magenta", () => {
    const image = bitmap(16, 16, [255, 0, 255, 255]);
    for (let y = 2; y < 14; y++) put(image, 5, y, [141, 3, 54, 255]);
    const result = cutOutBackground(image);
    for (let y = 2; y < 14; y++) expect(alpha(result, 5, y)).toBe(255);
    expect(alpha(result, 0, 0)).toBe(0);
  });
  it("keeps a continuous thin string when reducing to the final resolution", () => {
    const image = bitmap(16, 16);
    for (let y = 0; y < 16; y++) put(image, 5, y, [35, 25, 40, 255]);
    const result = shrinkToTile(image, { w: 4, h: 4 });
    for (let y = 0; y < 4; y++) expect(alpha(result, 1, y)).toBe(255);
    expect(alpha(result, 3, 2)).toBe(0);
  });
  it("preserves legitimate magenta scenery rather than cutting it out", () => {
    const result = runSteps(
      bitmap(8, 8, [255, 0, 255, 255]),
      { w: 8, h: 8 },
      SCENE_PICTURE_STEPS,
    );
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) expect(alpha(result, x, y)).toBe(255);
  });
  it("does not delete isolated intentional details during an edit", () => {
    const image = bitmap(8, 8);
    put(image, 2, 2, [255, 255, 255, 255]);
    const result = runSteps(image, { w: 8, h: 8 }, REDRAWN_PICTURE_STEPS);
    expect(alpha(result, 2, 2)).toBe(255);
  });
  it("keeps row-major order, full cell coordinates and detached moving details", () => {
    const sheet = bitmap(24, 16);
    for (let i = 0; i < 6; i++) {
      const x = (i % 3) * 8,
        y = Math.floor(i / 3) * 8;
      put(sheet, x + 1, y + 6, [40 + i * 30, 50, 50, 255]);
      put(sheet, x + 2 + (i % 4), y + 1, [220, 180, 50, 255]);
    }
    const cells = sheetCells(sheet, { cols: 3, rows: 2 }, 6);
    const frames = posesToFrames(cells, { w: 8, h: 8 }, true);
    for (let i = 0; i < 6; i++) {
      expect(cells[i]!.rgba[(6 * 8 + 1) * 4]).toBe(40 + i * 30);
      expect(alpha(frames[i]!, 1, 6)).toBe(255);
      expect(alpha(frames[i]!, 2 + (i % 4), 1)).toBe(255);
      expect(alpha(frames[i]!, 7, 7)).toBe(0);
    }
  });
  it("rejects an incomplete pose plan instead of inserting blank or repeated frames", () => {
    const plan = clampAnimationPlan(
      {
        frameCount: 3,
        tracks: [
          {
            name: "Fox",
            subject: "fox",
            reuse: -1,
            box: { x: 0, y: 0, w: 8, h: 8 },
            poses: ["starts", "ends"],
          },
        ],
      },
      8,
      8,
      0,
      3,
    );
    expect(plan.tracks).toEqual([]);
  });
});
