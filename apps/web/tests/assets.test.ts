import { describe, expect, it, vi } from "vitest";
import {
  assetFileUrl,
  isLocked,
  keepFrames,
  toAsset,
  toAssets,
  type AssetRow,
} from "@/features/assets/assets";
import { assetIdFor, sheetPixels } from "@/features/assets/publish";
import { normalizeColor, PALETTE_PRESETS } from "@/lib/palette/presets";
import {
  blankDocument,
  flattenDocument,
  type PigxelDocument,
} from "@/lib/pigxel-file/format";
import { celOf, createFrame } from "@/lib/sprite/frames";
import {
  TUTORIALS,
  findTutorial,
  type GuideState,
} from "@/features/tutorials/tutorials";

/** A 16 × 16 sprite whose frames are each filled with a different grey. */
function animated(frameCount: number): PigxelDocument {
  const doc = blankDocument(16, 16, "transparent");
  const layer = doc.layers[0]!.id;
  const frames = Array.from({ length: frameCount }, (_, i) =>
    i === 0 ? doc.frames[0]! : createFrame(120),
  );
  const cels = new Map(
    frames.map((frame, i) => {
      const pixels = new Uint8ClampedArray(16 * 16 * 4);
      for (let p = 0; p < pixels.length; p += 4)
        pixels.set([i * 40, i * 40, i * 40, 255], p);
      return [frame.id, new Map([[layer, pixels]])] as const;
    }),
  );
  return { ...doc, frames, cels };
}

describe("assets from the database", () => {
  const row: AssetRow = {
    id: "coin",
    name: "Coin",
    pack_id: "dungeon-heroes",
    kind: "sprite",
    width: 16,
    height: 16,
    frame_count: 4,
    frame_ms: 120,
    colors: ["#f5b41a"],
    file_path: "coin/1a2b.pigxel",
    sheet_path: "coin/3c4d.png",
    sort: 0,
    premium: false,
  };

  it("read their files from the public bucket", () => {
    const asset = toAsset(row);
    expect(asset.fileUrl).toBe(assetFileUrl("coin/1a2b.pigxel"));
    expect(asset.sheetUrl).toMatch(
      /\/storage\/v1\/object\/public\/assets\/coin\/3c4d\.png$/,
    );
    expect(asset.frames).toBe(4);
  });

  const signer = (
    items: { path: string; signedUrl: string; error: string | null }[],
  ) => {
    const createSignedUrls = vi.fn(async () => ({ data: items, error: null }));
    const from = vi.fn(() => ({ createSignedUrls }));
    return {
      client: { storage: { from } } as unknown as Parameters<
        typeof toAssets
      >[0],
      from,
      createSignedUrls,
    };
  };

  it("give paid plans short-lived links to premium files", async () => {
    const knight = {
      ...row,
      id: "knight",
      file_path: "knight/9f.pigxel",
      premium: true,
    };
    const { client, from } = signer([
      {
        path: "knight/9f.pigxel",
        signedUrl: "https://signed/knight",
        error: null,
      },
    ]);
    const [free, premium] = await toAssets(client, [row, knight]);
    expect(from).toHaveBeenCalledWith("premium-assets");
    expect(free!.fileUrl).toBe(assetFileUrl("coin/1a2b.pigxel"));
    expect(premium).toMatchObject({
      premium: true,
      fileUrl: "https://signed/knight",
    });
    expect(isLocked(premium!)).toBe(false);
  });

  it("lock premium files the session can't read", async () => {
    const knight = {
      ...row,
      id: "knight",
      file_path: "knight/9f.pigxel",
      premium: true,
    };
    const { client } = signer([
      { path: "knight/9f.pigxel", signedUrl: "", error: "Object not found" },
    ]);
    const [premium] = await toAssets(client, [knight]);
    expect(premium!.fileUrl).toBeNull();
    expect(isLocked(premium!)).toBe(true);
  });

  it("don't ask storage when nothing is premium", async () => {
    const { client, from } = signer([]);
    await toAssets(client, [row]);
    expect(from).not.toHaveBeenCalled();
  });

  it("can start a tile from their first frames only", () => {
    const doc = keepFrames(animated(3), 1);
    expect(doc.frames).toHaveLength(1);
    expect(doc.cels.size).toBe(1);
    expect(flattenDocument(doc)).toEqual(flattenDocument(animated(1)));
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
    const doc = animated(4);
    const sheet = sheetPixels(doc);
    expect(sheet).toMatchObject({ w: 64, h: 16 });
    const row = (
      pixels: Uint8ClampedArray,
      w: number,
      x: number,
      y: number,
    ) => [...pixels.subarray((y * w + x) * 4, (y * w + x + 16) * 4)];
    const third = celOf(doc.cels, doc.frames[2]!.id, doc.layers[0]!.id)!;
    expect(row(sheet.pixels, 64, 32, 5)).toEqual(row(third, 16, 0, 5));
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
    look: 0,
    framesDiffer: false,
    onion: 0,
    grid: 0,
    playing: false,
    exporting: false,
    floating: false,
    inserted: 0,
  };

  it("have unique slugs and practice tiles named like asset ids", () => {
    const slugs = TUTORIALS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const { practice } of TUTORIALS)
      if (practice.asset)
        expect(assetIdFor(practice.asset)).toBe(practice.asset);
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

  it("the shading guide notices recolours, not just new pixels", () => {
    const shading = findTutorial("shading-highlights")!;
    const shadows = shading.steps.find((s) => s.title === "Paint the shadows")!;
    expect(shadows.done!(state, state)).toBe(false);
    expect(shadows.done!({ ...state, look: 42 }, state)).toBe(true);
    expect(shadows.done!({ ...state, tool: "eraser", look: 42 }, state)).toBe(
      false,
    );
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
