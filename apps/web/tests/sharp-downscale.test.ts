import { describe, expect, it } from "vitest";
import {
  croppedAnimation,
  fitted,
  looksLikePixelArt,
  tooLarge,
} from "@/lib/pigxel-file/import-image";

const RED = [255, 0, 0, 255];
const BLUE = [0, 0, 255, 255];

function checker(w: number, h: number, block: number) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      rgba.set(
        (Math.floor(x / block) + Math.floor(y / block)) % 2 ? BLUE : RED,
        (y * w + x) * 4,
      );
  return { w, h, frames: [{ rgba, duration: 100 }] };
}

describe("big pictures", () => {
  it("knows pixel art by its few colors", () => {
    expect(looksLikePixelArt(checker(4, 4, 1).frames[0]!.rgba)).toBe(true);
    const noisy = new Uint8ClampedArray(600 * 4);
    for (let i = 0; i < 600; i++) noisy.set([i % 256, i >> 8, 7, 255], i * 4);
    expect(looksLikePixelArt(noisy)).toBe(false);
  });

  it("scales pixel art down without blending colors", () => {
    const out = fitted(checker(512, 512, 4));
    expect([out.w, out.h]).toEqual([256, 256]);
    const colors = new Set<string>();
    const rgba = out.frames[0]!.rgba;
    for (let i = 0; i < rgba.length; i += 4)
      colors.add(rgba.slice(i, i + 4).join());
    expect([...colors].sort()).toEqual([BLUE.join(), RED.join()].sort());
  });

  it("crops a piece at full size", () => {
    const big = checker(300, 280, 10);
    expect(tooLarge(big)).toBe(true);
    const piece = croppedAnimation(big, { x: 10, y: 0, w: 256, h: 256 });
    expect([piece.w, piece.h]).toEqual([256, 256]);
    expect([...piece.frames[0]!.rgba.slice(0, 4)]).toEqual(BLUE);
    expect(tooLarge(piece)).toBe(false);
  });
});
