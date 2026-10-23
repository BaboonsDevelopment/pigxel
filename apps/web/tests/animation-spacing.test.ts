import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { padAnimationReference } from "@/features/ai/animation-reference";
import {
  buildSheetAnimatePrompt,
  buildSheetPrompt,
} from "@/features/ai/helpers";

describe("animation source spacing", () => {
  const args = {
    subject: "a campfire",
    poses: ["small flame", "large flame"],
    cellW: 64,
    cellH: 64,
    layout: { cols: 2, rows: 1, aspectRatio: "2:1" },
    fromReference: true,
  };
  it("requires at least 15 source pixels of clear space in generation and animation prompts", () => {
    for (const prompt of [
      buildSheetPrompt(args),
      buildSheetAnimatePrompt(args),
    ]) {
      expect(prompt).toContain("at least 15 pixels");
      expect(prompt).toContain("horizontally AND vertically");
      expect(prompt).toContain("flames, shadows and particles");
      expect(prompt).toContain("NO artwork, stray pixels, separator lines");
    }
    expect(buildSheetAnimatePrompt(args)).not.toContain("fills its own cell");
  });
  it("preserves full-scene backgrounds without imposing chroma-key margins", () => {
    expect(buildSheetPrompt({ ...args, composition: "scene" })).not.toContain(
      "MANDATORY FRAME SPACING",
    );
    expect(
      buildSheetAnimatePrompt({ ...args, composition: "scene" }),
    ).not.toContain("MANDATORY FRAME SPACING");
  });
  it("builds real magenta gutters in the input reference without dropping poses or adding blended colours", async () => {
    const pixels = Buffer.alloc(128 * 64 * 4);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 128; x++)
        pixels.set(
          x < 64 ? [120, 40, 20, 255] : [20, 80, 140, 255],
          (y * 128 + x) * 4,
        );
    const source = await sharp(pixels, {
      raw: { width: 128, height: 64, channels: 4 },
    })
      .png()
      .toBuffer();
    const result = await padAnimationReference(
      { mimeType: "image/png", base64: source.toString("base64") },
      { cols: 2, rows: 1 },
    );
    const { data, info } = await sharp(Buffer.from(result.base64, "base64"))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(256);
    expect(info.height).toBe(128);
    const rgb = (x: number, y: number) => [
      ...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4),
    ];
    for (let x = 120; x < 136; x++)
      expect(rgb(x, 64)).toEqual([255, 0, 255, 255]);
    for (let y = 0; y < 8; y++) expect(rgb(64, y)).toEqual([255, 0, 255, 255]);
    expect(rgb(64, 64)).toEqual([120, 40, 20, 255]);
    expect(rgb(192, 64)).toEqual([20, 80, 140, 255]);
    const colors = new Set(
      Array.from({ length: info.width * info.height }, (_, i) =>
        [...data.subarray(i * 4, i * 4 + 4)].join(","),
      ),
    );
    expect(colors.size).toBe(3);
  });
});
