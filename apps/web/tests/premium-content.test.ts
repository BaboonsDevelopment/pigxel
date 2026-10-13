import { describe, expect, it } from "vitest";
import { isLocked } from "@/features/assets/assets";
import { STARTER_ASSETS } from "@/features/assets/starter";
import { TUTORIALS } from "@/features/tutorials/tutorials";
import { hasErrors, issuesOf } from "../scripts/assets/lib/checks";
import { loadPacks } from "../scripts/assets/lib/source";
import {
  ASSET_BUCKET,
  fileBucket,
  isPremium,
  PREMIUM_ASSET_BUCKET,
} from "../scripts/assets/lib/upload";

const packs = loadPacks();
const premium = packs.find((pack) => pack.id === "premium")!;

describe("premium pack", () => {
  it("is a paid pack whose assets all pass the checks", () => {
    expect(premium.tier).toBe("paid");
    expect(premium.issues).toEqual([]);
    expect(premium.assets.length).toBeGreaterThan(0);
    for (const source of premium.assets)
      expect(hasErrors(issuesOf(source, premium)), source.key).toBe(false);
  });

  it("doesn't reuse an id from the starter set or another pack", () => {
    const elsewhere = new Set([
      ...STARTER_ASSETS.map((asset) => asset.id),
      ...packs
        .filter((pack) => pack.id !== "premium")
        .flatMap((pack) => pack.assets.map((asset) => asset.id)),
    ]);
    expect(
      premium.assets.map((a) => a.id).filter((id) => elsewhere.has(id)),
    ).toEqual([]);
  });

  it("uploads paid files to the private bucket and free ones to the public one", () => {
    expect(isPremium("paid")).toBe(true);
    expect(isPremium("free")).toBe(false);
    expect(fileBucket(true)).toBe(PREMIUM_ASSET_BUCKET);
    expect(fileBucket(false)).toBe(ASSET_BUCKET);
  });

  it("locks premium assets the viewer can't open", () => {
    expect(isLocked({ premium: true, fileUrl: null })).toBe(true);
    expect(isLocked({ premium: true, fileUrl: "https://signed" })).toBe(false);
    expect(isLocked({ premium: false, fileUrl: "https://public" })).toBe(false);
  });
});

describe("premium tutorials", () => {
  it("practise on assets from the premium pack", () => {
    const tutorials = TUTORIALS.filter((tutorial) => tutorial.premium);
    expect(tutorials.length).toBeGreaterThan(0);
    const ids = new Set(premium.assets.map((asset) => asset.id));
    for (const tutorial of tutorials)
      if (tutorial.practice.asset)
        expect(ids.has(tutorial.practice.asset), tutorial.slug).toBe(true);
  });
});
