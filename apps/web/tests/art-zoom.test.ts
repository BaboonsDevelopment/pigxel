import { describe, expect, it } from "vitest";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  nextZoom,
} from "@/features/explore/components/art-page/helpers";

describe("nextZoom", () => {
  it("steps to the next zoom level each way", () => {
    expect(nextZoom(1, 1)).toBe(1.5);
    expect(nextZoom(1, -1)).toBe(0.75);
    expect(nextZoom(8, 1)).toBe(12);
  });

  it("continues from a fitted zoom between levels", () => {
    expect(nextZoom(13.7, 1)).toBe(16);
    expect(nextZoom(13.7, -1)).toBe(12);
  });

  it("stops at the ends", () => {
    expect(nextZoom(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
    expect(nextZoom(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
  });
});
