import { describe, expect, it } from "vitest";
import { canvasSizeOf } from "@/features/explore/constants";

describe("an art's Explore size", () => {
  it("goes by the longest side", () => {
    expect(canvasSizeOf(16, 16)?.value).toBe("16");
    expect(canvasSizeOf(17, 8)?.value).toBe("32");
    expect(canvasSizeOf(40, 64)?.value).toBe("64");
    expect(canvasSizeOf(256, 100)?.value).toBe("256");
  });

  it("has none past the largest filter", () => {
    expect(canvasSizeOf(512, 512)).toBeNull();
  });
});
