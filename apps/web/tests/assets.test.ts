import { describe, expect, it } from "vitest";
import {
  ASSETS,
  assetDocument,
  assetPalette,
  assetPixels,
  assetRuns,
  assetSize,
  findAsset,
} from "@/lib/assets/assets";
import { normalizeColor, PALETTE_PRESETS } from "@/lib/palette/presets";
import {
  flattenDocument,
  parsePigxel,
  serializePigxel,
} from "@/lib/pigxel-file/format";
import { celOf } from "@/lib/sprite/frames";
import {
  TUTORIALS,
  findTutorial,
  type GuideState,
} from "@/lib/tutorials/tutorials";

describe("assets", () => {
  it("have unique ids", () => {
    const ids = ASSETS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(ASSETS)(
    "$id is drawn on an even grid with known colours",
    (asset) => {
      const { w, h } = assetSize(asset);
      for (const frame of asset.frames) {
        expect(frame).toHaveLength(h);
        for (const row of frame) {
          expect(row).toHaveLength(w);
          for (const letter of row)
            if (letter !== ".") expect(asset.colors[letter]).toBeDefined();
        }
      }
      for (const color of Object.values(asset.colors))
        expect(normalizeColor(color)).toBe(color);
    },
  );

  it("tiles are fully opaque, so they meet without gaps", () => {
    for (const asset of ASSETS.filter((a) => a.category === "tiles"))
      for (const row of asset.frames.flat()) expect(row).not.toContain(".");
  });

  it("turns letters into pixels, with dots left transparent", () => {
    const heart = findAsset("heart")!;
    const pixels = assetPixels(heart);
    const { w } = assetSize(heart);
    // Row 2 starts "..kk": transparent, then the outline colour.
    expect([...pixels.subarray((2 * w + 1) * 4, (2 * w + 2) * 4)]).toEqual([
      0, 0, 0, 0,
    ]);
    expect([...pixels.subarray((2 * w + 2) * 4, (2 * w + 3) * 4)]).toEqual([
      0x3e, 0x27, 0x31, 255,
    ]);
  });

  it("runs cover every painted pixel exactly once", () => {
    for (const asset of ASSETS) {
      const painted = asset.frames[0]!.join("").replaceAll(".", "").length;
      const covered = assetRuns(asset).reduce((sum, run) => sum + run.w, 0);
      expect(covered).toBe(painted);
    }
  });

  it("becomes a tile that saves and opens with every frame", () => {
    const coin = findAsset("coin")!;
    const doc = parsePigxel(serializePigxel(assetDocument(coin)));
    expect(doc.width).toBe(16);
    expect(doc.frames).toHaveLength(4);
    expect(doc.frames[0]!.duration).toBe(coin.duration);
    expect(doc.palette).toEqual(assetPalette(coin));
    doc.frames.forEach((frame, i) =>
      expect(celOf(doc.cels, frame.id, doc.layers[0]!.id)).toEqual(
        assetPixels(coin, i),
      ),
    );
  });

  it("can keep only its first frames", () => {
    const slime = findAsset("slime")!;
    const doc = assetDocument(slime, { frames: 1 });
    expect(doc.frames).toHaveLength(1);
    expect(flattenDocument(doc)).toEqual(assetPixels(slime));
  });
});

describe("palette presets", () => {
  it("have unique ids and valid colours", () => {
    const ids = PALETTE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of PALETTE_PRESETS) {
      expect(preset.colors.length).toBeGreaterThan(0);
      for (const color of preset.colors)
        expect(normalizeColor(color)).toBe(color);
      expect(new Set(preset.colors).size).toBe(preset.colors.length);
    }
  });
});

describe("tutorials", () => {
  const state: GuideState = {
    tool: "pen",
    color: "#000000",
    frames: 1,
    painted: 0,
    framesDiffer: false,
    onion: 0,
    grid: 0,
    playing: false,
    exporting: false,
    floating: false,
    inserted: 0,
  };

  it("have unique slugs and practice tiles that exist", () => {
    const slugs = TUTORIALS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const { practice } of TUTORIALS)
      if (practice.asset) expect(findAsset(practice.asset)).not.toBeNull();
  });

  it("steps that wait for a change aren't done when nothing changed", () => {
    const basics = findTutorial("pixel-art-basics")!;
    const draw = basics.steps.find((s) => s.title === "Draw an outline")!;
    expect(draw.done!(state, state)).toBe(false);
    expect(draw.done!({ ...state, painted: 12 }, state)).toBe(true);
  });

  it("the animation guide waits for frames that differ", () => {
    const animation = findTutorial("first-animation")!;
    const squash = animation.steps.find((s) => s.title === "Squash the slime")!;
    expect(squash.done!({ ...state, frames: 2 }, state)).toBe(false);
    expect(
      squash.done!({ ...state, frames: 2, framesDiffer: true }, state),
    ).toBe(true);
  });

  it("the tileset guide waits for an asset to be inserted", () => {
    const tileset = findTutorial("build-tileset")!;
    const insert = tileset.steps.find(
      (s) => s.title === "Insert a grass tile",
    )!;
    expect(insert.done!(state, state)).toBe(false);
    expect(insert.done!({ ...state, inserted: 1 }, state)).toBe(true);
  });
});
