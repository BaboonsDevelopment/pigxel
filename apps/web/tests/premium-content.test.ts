import { describe, expect, it } from "vitest";
import { PREMIUM_ASSETS } from "@/features/assets/premium";
import { STARTER_ASSETS } from "@/features/assets/starter";
import { isLocked } from "@/features/assets/assets";
import { TUTORIALS } from "@/features/tutorials/tutorials";

describe("premium asset set", () => {
  it("draws every frame as a full 16 × 16 grid in its own colours", () => {
    for (const asset of PREMIUM_ASSETS) {
      expect(["characters", "items", "nature", "tiles"]).toContain(
        asset.category,
      );
      for (const frame of asset.frames) {
        expect(frame, asset.id).toHaveLength(16);
        for (const row of frame) {
          expect(row, `${asset.id}: ${row}`).toHaveLength(16);
          for (const pixel of row)
            if (pixel !== ".")
              expect(asset.colors[pixel], `${asset.id}: ${pixel}`).toMatch(
                /^#[0-9a-f]{6}$/,
              );
        }
      }
    }
  });

  it("doesn't reuse a free asset's id", () => {
    const free = new Set(STARTER_ASSETS.map((asset) => asset.id));
    const ids = PREMIUM_ASSETS.map((asset) => asset.id);
    expect(ids.filter((id) => free.has(id))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("locks premium assets the viewer can't open", () => {
    expect(isLocked({ premium: true, fileUrl: null })).toBe(true);
    expect(isLocked({ premium: true, fileUrl: "https://signed" })).toBe(false);
    expect(isLocked({ premium: false, fileUrl: "https://public" })).toBe(false);
  });
});

describe("premium tutorials", () => {
  it("has some, and each practises on a premium asset that exists", () => {
    const premium = TUTORIALS.filter((tutorial) => tutorial.premium);
    expect(premium.length).toBeGreaterThan(0);
    const ids = new Set(PREMIUM_ASSETS.map((asset) => asset.id));
    for (const tutorial of premium)
      if (tutorial.practice.asset)
        expect(ids.has(tutorial.practice.asset), tutorial.slug).toBe(true);
  });
});
