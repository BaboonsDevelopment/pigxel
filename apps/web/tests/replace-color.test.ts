import { describe, expect, it } from "vitest";
import { replacedColor } from "@/features/editor/pixel-canvas/effects";

const pixels = () =>
  new Uint8ClampedArray([
    ...[0, 200, 0, 255],
    ...[0, 160, 20, 255],
    ...[200, 0, 0, 255],
    ...[0, 0, 0, 0],
  ]);

describe("replace colour", () => {
  it("replaces only the exact colour with no tolerance", () => {
    const out = replacedColor(
      pixels(),
      [0, 200, 0, 255],
      [0, 0, 255, 255],
      null,
    );
    expect([...out.slice(0, 8)]).toEqual([0, 0, 255, 255, 0, 160, 20, 255]);
  });
  it("takes shades within the tolerance, never clear pixels", () => {
    const out = replacedColor(
      pixels(),
      [0, 200, 0, 255],
      [0, 0, 255, 255],
      null,
      255,
    );
    expect([...out.slice(4, 8)]).toEqual([0, 0, 255, 255]);
    expect([...out.slice(12, 16)]).toEqual([0, 0, 0, 0]);
  });
  it("keeps shading by shifting each colour by the same amount", () => {
    const out = replacedColor(
      pixels(),
      [0, 200, 0, 255],
      [0, 0, 200, 255],
      null,
      60,
      true,
    );
    expect([...out.slice(0, 8)]).toEqual([0, 0, 200, 255, 0, 0, 220, 255]);
    expect([...out.slice(8, 12)]).toEqual([200, 0, 0, 255]);
  });
  it("stays inside the selection", () => {
    const out = replacedColor(
      pixels(),
      [0, 200, 0, 255],
      [0, 0, 255, 255],
      new Uint8Array([0, 1, 1, 1]),
      60,
    );
    expect([...out.slice(0, 4)]).toEqual([0, 200, 0, 255]);
    expect([...out.slice(4, 8)]).toEqual([0, 0, 255, 255]);
  });
});
