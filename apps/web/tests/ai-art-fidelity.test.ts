import { describe, expect, it } from "vitest";
import {
  buildImagePrompt,
  buildRedrawPrompt,
  buildEditContext,
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
  it("uses a straight-on 2D default for a room without inventing a diorama camera or empty outside backdrop", () => {
    const prompt = buildImagePrompt(
      "a cozy bedroom filling the whole tile",
      128,
      128,
      false,
      "scene",
    );
    expect(prompt).toContain("neither specifies a camera angle");
    expect(prompt).toContain("conventional straight-on 2D view");
    expect(prompt).toContain("Do not invent an isometric");
    expect(prompt).toContain("including all four corners");
    expect(prompt).toContain("extend its walls, floor");
  });
  it("lets an explicit or referenced isometric view override the default", () => {
    const prompt = buildImagePrompt(
      "an isometric bedroom",
      128,
      128,
      true,
      "scene",
      "isometric pixel art",
    );
    expect(prompt).toContain("Requested visual style: isometric pixel art");
    expect(prompt).toContain(
      "An explicitly requested or referenced view takes priority over this default",
    );
    expect(prompt).toContain("reference");
  });
  it("allows a scene edit to replace black outer margins while preserving the existing view and interior objects", () => {
    const prompt = buildRedrawPrompt(
      "remove black outside areas and fill the whole tile",
      128,
      128,
      "scene",
    );
    expect(prompt).toContain(
      "old outer margins and plain backdrop must change",
    );
    expect(prompt).toContain("continuation of the actual scene");
    expect(prompt).toContain("Keep the existing camera angle");
    expect(prompt).not.toContain(
      "Keep the original placement, scale and margins",
    );
    expect(prompt).toContain(
      "Preserve intentional dark objects, lighting and shadows",
    );
    expect(prompt).not.toContain("Fit the complete requested silhouette");
    expect(prompt).toContain("floor into the lower outside corners");
  });
  it("keeps the actual user's floor-extension constraints for a short follow-up, without treating success captions as instructions", () => {
    const context = buildEditContext([
      { role: "user", content: "make an old unrelated scene black" },
      {
        role: "user",
        content: "draw a cozy bedroom",
        action: { kind: "generate", request: "bedroom" },
      },
      {
        role: "user",
        content: "fill the whole tile without black outside areas",
      },
      { role: "assistant", content: "All black borders were removed" },
      {
        role: "user",
        content: "but why you dont fix that in a floor, make there also",
      },
    ]);
    expect(context).toContain(
      "fill the whole tile without black outside areas",
    );
    expect(context).toContain("make there also");
    expect(context).not.toContain("All black borders were removed");
    expect(context).not.toContain("old unrelated");
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
  it("fits a portrait-shaped scene to the actual tile without clipping its edges or adding transparent sidebars", () => {
    const image = bitmap(8, 16);
    const colours = [
      [40, 100, 180, 255],
      [255, 0, 255, 255],
      [40, 130, 50, 255],
      [100, 70, 20, 255],
    ];
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 8; x++)
        put(image, x, y, colours[(y < 8 ? 0 : 2) + (x < 4 ? 0 : 1)]!);
    const result = runSteps(image, { w: 8, h: 8 }, SCENE_PICTURE_STEPS);
    for (const [i, [x, y]] of [
      [0, 0],
      [7, 0],
      [0, 7],
      [7, 7],
    ].entries())
      expect([
        ...result.rgba.slice((y! * 8 + x!) * 4, (y! * 8 + x!) * 4 + 4),
      ]).toEqual(colours[i]);
    for (let i = 3; i < result.rgba.length; i += 4)
      expect(result.rgba[i]).toBe(255);
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
