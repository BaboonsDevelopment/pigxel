import { describe, expect, it } from "vitest";
import {
  centeredCrop,
  clampCrop,
  CROP_BOX,
  zoomAround,
} from "@/features/settings/profile/avatar-crop/helpers";

describe("avatar crop", () => {
  it("centres a wide picture so its height fills the box", () => {
    const crop = centeredCrop(600, 300);
    expect(crop.zoom).toBe(1);
    expect(crop.y).toBe(0);
    expect(crop.x).toBe((CROP_BOX - 600 * (CROP_BOX / 300)) / 2);
  });

  it("never leaves an empty gap inside the box", () => {
    const crop = clampCrop({ x: 50, y: -999, zoom: 1 }, 300, 300);
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(CROP_BOX - CROP_BOX);
  });

  it("keeps the zoom between 1 and the maximum", () => {
    expect(clampCrop({ x: 0, y: 0, zoom: 0.2 }, 100, 100).zoom).toBe(1);
    expect(clampCrop({ x: 0, y: 0, zoom: 99 }, 100, 100).zoom).toBe(6);
  });

  it("zooms around the centre of the box", () => {
    const crop = zoomAround(centeredCrop(100, 100), 2, 100, 100);
    expect(crop.x).toBe(-CROP_BOX / 2);
    expect(crop.y).toBe(-CROP_BOX / 2);
  });
});
