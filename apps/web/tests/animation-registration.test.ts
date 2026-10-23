import { describe, expect, it } from "vitest";
import {
  animationCells,
  bitmapToFrames,
  posesToFrames,
} from "@/lib/image/sheet";
import { registerAnimationFrames } from "@/lib/image/register-animation";
import { opaqueBox, type Bitmap } from "@/lib/image/bitmap";
import { removeSheetDividers } from "@/lib/image/steps/remove-sheet-dividers";

const blank = (w: number, h: number): Bitmap => ({
  w,
  h,
  rgba: new Uint8ClampedArray(w * h * 4),
});
function rect(
  image: Bitmap,
  x: number,
  y: number,
  w: number,
  h: number,
  color = [180, 100, 40, 255],
) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++)
      image.rgba.set(color, (yy * image.w + xx) * 4);
}
const count = (image: Bitmap, color?: number[]) =>
  Array.from({ length: image.w * image.h }, (_, i) => i).filter(
    (i) =>
      image.rgba[i * 4 + 3] &&
      (!color || color.every((v, c) => image.rgba[i * 4 + c] === v)),
  ).length;
function pose(x: number, y: number, headX = 0, headY = 0) {
  const image = blank(32, 32);
  rect(image, 8 + x, 16 + y, 12, 9); // planted body
  rect(image, 9 + x, 25 + y, 3, 2, [70, 40, 30, 255]);
  rect(image, 16 + x, 25 + y, 3, 2, [70, 40, 30, 255]);
  rect(image, 10 + x + headX, 9 + y + headY, 8, 7 - headY, [230, 180, 90, 255]);
  return image;
}

describe("generated animation registration", () => {
  it("separates three bodies connected by thick tail/paw contacts and preserves every source pixel", () => {
    const sheet = blank(96, 64);
    for (let i = 0; i < 6; i++)
      rect(sheet, (i % 3) * 32 + 4, Math.floor(i / 3) * 32 + 4, 24, 24, [
        60 + i * 20,
        80,
        40,
        255,
      ]);
    rect(sheet, 27, 49, 10, 9, [120, 80, 40, 255]);
    rect(sheet, 59, 49, 10, 9, [140, 80, 40, 255]);
    const poses = animationCells(sheet, { cols: 3, rows: 2 }, 6);
    expect(poses.every(Boolean)).toBe(true);
    expect(poses.reduce((n, p) => n + count(p!), 0)).toBe(count(sheet));
    poses.forEach((p, i) =>
      expect(count(p!, [60 + i * 20, 80, 40, 255])).toBeGreaterThan(400),
    );
  });
  it("does not invent six figures from a single large solid object", () => {
    const sheet = blank(96, 64);
    rect(sheet, 2, 2, 92, 60);
    expect(animationCells(sheet, { cols: 3, rows: 2 }, 6).some((f) => !f)).toBe(
      true,
    );
  });
  it("keeps a long dark prop when it does not form the sheet's cell grid", () => {
    const sheet = blank(96, 64);
    rect(sheet, 47, 0, 2, 64, [40, 20, 30, 255]);
    expect(removeSheetDividers(sheet, { cols: 3, rows: 2 }, 6)).toEqual(sheet);
  });
  it("removes full-sheet black separator rules that join all six characters into one component", () => {
    const sheet = blank(96, 64);
    for (let i = 0; i < 6; i++)
      rect(sheet, (i % 3) * 32 + 4, Math.floor(i / 3) * 32 + 4, 28, 28, [
        50 + 20 * i,
        80,
        40,
        255,
      ]);
    rect(sheet, 31, 0, 2, 64, [30, 10, 20, 255]);
    rect(sheet, 63, 0, 2, 64, [30, 10, 20, 255]);
    rect(sheet, 0, 31, 96, 2, [30, 10, 20, 255]);
    // Compressed provider output has occasional off-colour pixels on the rules.
    for (const x of [31, 32, 63, 64])
      for (const y of [20, 50])
        sheet.rgba.set([145, 20, 90, 255], (y * sheet.w + x) * 4);
    const frames = bitmapToFrames(
      sheet,
      { cols: 3, rows: 2 },
      6,
      { w: 32, h: 32 },
      "animation",
    );
    expect(frames.every(Boolean)).toBe(true);
    frames.forEach((f, i) => {
      expect(count(f!, [50 + 20 * i, 80, 40, 255])).toBeGreaterThan(400);
      expect(count(f!, [30, 10, 20, 255])).toBe(0);
    });
  });
  it("separates figures touching only at a diagonal pixel without cutting either silhouette", () => {
    const sheet = blank(40, 32);
    rect(sheet, 8, 4, 12, 12, [100, 80, 40, 255]);
    rect(sheet, 20, 16, 12, 12, [200, 80, 40, 255]);
    const frames = animationCells(sheet, { cols: 2, rows: 1 }, 2);
    expect(frames.every(Boolean)).toBe(true);
    expect(count(frames[0]!, [100, 80, 40, 255])).toBe(144);
    expect(count(frames[0]!)).toBe(144);
    expect(count(frames[1]!, [200, 80, 40, 255])).toBe(144);
    expect(count(frames[1]!)).toBe(144);
  });
  it.each(["pink", "checkerboard"])(
    "extracts complete poses when the model painted an opaque %s backdrop instead of the requested key",
    (background) => {
      const sheet = blank(64, 96);
      for (let y = 0; y < 96; y++)
        for (let x = 0; x < 64; x++) {
          const rgb =
            background === "pink"
              ? [235, 0, 125]
              : (Math.floor(x / 4) + Math.floor(y / 4)) % 2
                ? [210, 210, 210]
                : [255, 255, 255];
          sheet.rgba.set([...rgb, 255], (y * 64 + x) * 4);
        }
      for (let i = 0; i < 6; i++) {
        const x = (i % 2) * 32,
          y = Math.floor(i / 2) * 32;
        rect(sheet, x + 7, y + 7, 18, 20, [50, 40, 30, 255]);
        rect(sheet, x + 9, y + 9, 14, 16, [255, 255, 255, 255]); // enclosed white fur survives
      }
      const frames = bitmapToFrames(
        sheet,
        { cols: 2, rows: 3 },
        6,
        { w: 32, h: 32 },
        "animation",
      );
      expect(frames.every(Boolean)).toBe(true);
      expect(frames.every((f) => count(f!, [255, 255, 255, 255]) > 100)).toBe(
        true,
      );
      expect(frames.every((f) => count(f!) < 500)).toBe(true);
    },
  );
  it("finds all six poses with large outer padding and uneven gutters instead of rejecting empty nominal cells", () => {
    const sheet = blank(220, 240);
    const xs = [110, 160],
      ys = [50, 115, 190];
    for (let i = 0; i < 6; i++)
      rect(sheet, xs[i % 2]!, ys[Math.floor(i / 2)]!, 12 + i, 20, [
        50 + i * 20,
        80,
        60,
        255,
      ]);
    const frames = animationCells(sheet, { cols: 3, rows: 2 }, 6);
    expect(frames.every(Boolean)).toBe(true);
    for (let i = 0; i < 6; i++) {
      expect(count(frames[i]!, [50 + i * 20, 80, 60, 255])).toBe((12 + i) * 20);
      expect(count(frames[i]!)).toBe((12 + i) * 20);
    }
  });
  it("keeps a whole silhouette in its own frame when it crosses a nominal row boundary", () => {
    const image = blank(40, 60);
    const red = [220, 40, 40, 255],
      blue = [40, 60, 220, 255];
    rect(image, 5, 4, 10, 20, red); // extends four pixels into the second row
    rect(image, 25, 4, 10, 12, blue);
    rect(image, 5, 28, 10, 8, blue);
    rect(image, 25, 28, 10, 8, red);
    rect(image, 5, 44, 10, 10, red);
    rect(image, 25, 44, 10, 10, blue);
    const frames = animationCells(image, { cols: 2, rows: 3 }, 6);
    expect(frames).toHaveLength(6);
    expect(count(frames[0]!, red)).toBe(200);
    expect(count(frames[2]!, red)).toBe(0);
    expect(count(frames[2]!, blue)).toBe(80);
    expect(
      frames.every((f) => f?.w === frames[0]!.w && f.h === frames[0]!.h),
    ).toBe(true);
  });
  it("removes x/y drift while retaining head motion and every silhouette pixel", () => {
    const frames = [pose(0, 0), pose(3, -2, 2, -3), pose(-2, 1, -1, 1)];
    const aligned = registerAnimationFrames(frames);
    const feet = aligned.map((f) => {
      const xs: number[] = [],
        ys: number[] = [];
      for (let y = 0; y < f!.h; y++)
        for (let x = 0; x < f!.w; x++) {
          const p = (y * f!.w + x) * 4;
          if (f!.rgba[p] === 70 && f!.rgba[p + 3]) {
            xs.push(x);
            ys.push(y);
          }
        }
      return { left: Math.min(...xs), bottom: Math.max(...ys) };
    });
    expect(feet).toEqual([feet[0], feet[0], feet[0]]);
    aligned.forEach((frame, i) =>
      expect(count(frame!)).toBe(count(frames[i]!)),
    );
    expect(opaqueBox(aligned[1]!)!.y).toBeLessThan(opaqueBox(aligned[0]!)!.y);
    expect(registerAnimationFrames(aligned)).toEqual(aligned);
  });
  it("fits outstretched poses using one shared scale instead of clipping or stretching individual frames", () => {
    const a = blank(32, 32),
      b = blank(32, 32);
    rect(a, 7, 13, 12, 12);
    rect(b, 15, 13, 12, 12);
    rect(b, 26, 3, 5, 12);
    const frames = registerAnimationFrames([a, b]);
    for (const frame of frames) {
      const box = opaqueBox(frame!)!;
      expect(box.x).toBeGreaterThanOrEqual(2);
      expect(box.y).toBeGreaterThanOrEqual(2);
      expect(box.x + box.w).toBeLessThanOrEqual(30);
      expect(box.y + box.h).toBeLessThanOrEqual(30);
    }
    expect(count(frames[1]!)).toBeGreaterThan(count(frames[0]!));
  });
  it("does not cancel an intentional jump or a detached projectile", () => {
    const frames = [pose(0, 0), pose(2, -6)];
    rect(frames[1]!, 27, 2, 2, 2, [30, 100, 220, 255]);
    expect(registerAnimationFrames(frames, "fixed")).toEqual(frames);
  });
  it("keeps a detached effect and frame order through extraction and final-size conversion", () => {
    const sheet = blank(48, 24);
    rect(sheet, 6, 12, 8, 8, [100, 60, 40, 255]);
    rect(sheet, 30, 12, 8, 8, [200, 60, 40, 255]);
    rect(sheet, 19, 3, 2, 2, [40, 200, 80, 255]);
    const frames = posesToFrames(
      animationCells(sheet, { cols: 2, rows: 1 }, 2),
      { w: 24, h: 24 },
      true,
    );
    expect(count(frames[0]!, [40, 200, 80, 255])).toBe(4);
    expect(count(frames[1]!, [40, 200, 80, 255])).toBe(0);
    expect(frames[0]!.rgba[(12 * 24 + 6) * 4]).toBe(100);
    expect(frames[1]!.rgba[(12 * 24 + 6) * 4]).toBe(200);
  });
});
