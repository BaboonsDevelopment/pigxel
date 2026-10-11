import { describe, expect, it } from "vitest";
import { rectangleSpan } from "@/features/editor/pixel-canvas/pen";

describe("rectangle from centre", () => {
  it("keeps the initial pixel at the centre in every drag direction", () => {
    const center = { x: 10, y: 20 };
    for (const end of [
      { x: 14, y: 23 },
      { x: 6, y: 23 },
      { x: 14, y: 17 },
      { x: 6, y: 17 },
    ]) {
      const span = rectangleSpan(center, end, false, true);
      expect((span.from.x + span.to.x) / 2).toBe(center.x);
      expect((span.from.y + span.to.y) / 2).toBe(center.y);
    }
  });
  it("combines Alt and Shift to make a centred square", () => {
    const span = rectangleSpan({ x: 10, y: 10 }, { x: 14, y: 12 }, true, true);
    expect(Math.abs(span.to.x - span.from.x)).toBe(
      Math.abs(span.to.y - span.from.y),
    );
    expect((span.from.x + span.to.x) / 2).toBe(10);
    expect((span.from.y + span.to.y) / 2).toBe(10);
  });
  it("retains corner-to-corner drawing without Alt", () => {
    expect(
      rectangleSpan({ x: 10, y: 10 }, { x: 14, y: 12 }, false, false),
    ).toEqual({ from: { x: 10, y: 10 }, to: { x: 14, y: 12 } });
  });
});
