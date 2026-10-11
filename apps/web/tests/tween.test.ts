import { describe, expect, it } from "vitest";
import { tweenOffsets } from "@/lib/sprite/tween";

describe("tweening", () => {
  it("spreads the move evenly and can end at the target", () => {
    expect(tweenOffsets(8, 0, 3, "linear", true)).toEqual([
      { x: 2, y: 0 },
      { x: 4, y: 0 },
      { x: 6, y: 0 },
      { x: 8, y: 0 },
    ]);
    expect(tweenOffsets(0, -4, 1, "linear", false)).toEqual([{ x: 0, y: -2 }]);
  });
  it("starts slowly when speeding up", () => {
    const [first, , third] = tweenOffsets(16, 0, 3, "in", false);
    expect(first!.x).toBeLessThan(4);
    expect(third!.x).toBeGreaterThan(8);
  });
});
