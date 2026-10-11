import { describe, expect, it } from "vitest";
import { encodeSvg } from "@/features/editor/export/svg";

describe("SVG export", () => {
  it("joins same-coloured pixels in a row and skips empty ones", () => {
    const rgba = new Uint8ClampedArray([
      255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 0, 0, 0, 255, 128,
    ]);
    const svg = encodeSvg(rgba, 4, 1, 10);
    expect(svg).toContain('width="40" height="10" viewBox="0 0 4 1"');
    expect(svg).toContain('<path fill="#ff0000" d="M0 0h2v1h-2z"/>');
    expect(svg).toContain(
      '<path fill="#0000ff" fill-opacity="0.502" d="M3 0h1v1h-1z"/>',
    );
    expect(svg.match(/<path/g)).toHaveLength(2);
  });
});
