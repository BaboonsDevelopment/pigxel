import { describe, expect, it } from "vitest";
import {
  assetFileUrl,
  keepFrames,
  toAsset,
  type AssetRow,
} from "@/features/assets/assets";
import { assetIdFor, sheetPixels } from "@/features/assets/publish";
import {
  STARTER_ASSETS,
  starterDocument,
  starterPixels,
} from "@/features/assets/starter";
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
} from "@/features/tutorials/tutorials";

describe("the starter set", () => {
  it("has unique ids that work as asset ids", () => {
    const ids = STARTER_ASSETS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const asset of STARTER_ASSETS)
      expect(assetIdFor(asset.id)).toBe(asset.id);
  });

  it.each(STARTER_ASSETS)(
    "$id is drawn on an even grid with known colours",
    (asset) => {
      const w = asset.frames[0]![0]!.length;
      const h = asset.frames[0]!.length;
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
    for (const asset of STARTER_ASSETS.filter((a) => a.category === "tiles"))
      for (const row of asset.frames.flat()) expect(row).not.toContain(".");
  });

  it("becomes a tile that saves and opens with every frame", () => {
    const coin = STARTER_ASSETS.find((a) => a.id === "coin")!;
    const doc = parsePigxel(serializePigxel(starterDocument(coin)));
    expect(doc.width).toBe(16);
    expect(doc.frames).toHaveLength(4);
    expect(doc.frames[0]!.duration).toBe(coin.duration);
    doc.frames.forEach((frame, i) =>
      expect(celOf(doc.cels, frame.id, doc.layers[0]!.id)).toEqual(
        starterPixels(coin, i),
      ),
    );
  });
});

describe("assets from the database", () => {
  const row: AssetRow = {
    id: "coin",
    name: "Coin",
    category: "items",
    width: 16,
    height: 16,
    frame_count: 4,
    frame_ms: 120,
    colors: ["#f5b41a"],
    file_path: "coin/1a2b.pigxel",
    sheet_path: "coin/3c4d.png",
    sort: 0,
  };

  it("read their files from the public bucket", () => {
    const asset = toAsset(row);
    expect(asset.fileUrl).toBe(assetFileUrl("coin/1a2b.pigxel"));
    expect(asset.sheetUrl).toMatch(
      /\/storage\/v1\/object\/public\/assets\/coin\/3c4d\.png$/,
    );
    expect(asset.frames).toBe(4);
  });

  it("can start a tile from their first frames only", () => {
    const slime = STARTER_ASSETS.find((a) => a.id === "slime")!;
    const doc = keepFrames(starterDocument(slime), 1);
    expect(doc.frames).toHaveLength(1);
    expect(doc.cels.size).toBe(1);
    expect(flattenDocument(doc)).toEqual(starterPixels(slime));
  });
});

describe("publishing", () => {
  it("makes ids from names", () => {
    expect(assetIdFor("Gold coin!")).toBe("gold-coin");
    expect(assetIdFor("  Évil  Bat ")).toBe("evil-bat");
    expect(assetIdFor("!!!")).toBe("");
    expect(assetIdFor("a".repeat(30) + " " + "b".repeat(30))).toHaveLength(40);
    expect(assetIdFor("a".repeat(39) + " b")).toBe("a".repeat(39));
  });

  it("lays the frames side by side on the sheet", () => {
    const coin = STARTER_ASSETS.find((a) => a.id === "coin")!;
    const doc = starterDocument(coin);
    const sheet = sheetPixels(doc);
    expect(sheet).toMatchObject({ w: 64, h: 16 });
    const row = (
      pixels: Uint8ClampedArray,
      w: number,
      x: number,
      y: number,
    ) => [...pixels.subarray((y * w + x) * 4, (y * w + x + 16) * 4)];
    expect(row(sheet.pixels, 64, 32, 5)).toEqual(
      row(starterPixels(coin, 2), 16, 0, 5),
    );
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
      if (practice.asset)
        expect(STARTER_ASSETS.map((a) => a.id)).toContain(practice.asset);
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
