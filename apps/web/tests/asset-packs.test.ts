import { unzlibSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parsePigxel } from "@/lib/pigxel-file/format";
import { framesOf, pigxelFile, sheetOf } from "../scripts/assets/lib/pigxel";
import { encodePng } from "../scripts/assets/lib/png";
import { PACKS } from "../scripts/assets/packs";

const assets = PACKS.flatMap((pack) =>
  pack.assets.map((asset) => [`${pack.id}/${asset.id}`, asset] as const),
);

describe("generated asset packs", () => {
  it("have unique asset ids across packs", () => {
    const ids = PACKS.flatMap((pack) => pack.assets.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(assets)(
    "%s opens in the editor with its clips and slices",
    (_, asset) => {
      const frames = framesOf(asset);
      const doc = parsePigxel(pigxelFile(asset, frames));
      expect([doc.width, doc.height]).toEqual([frames.w, frames.h]);
      expect(doc.frames.map((f) => f.duration)).toEqual(
        frames.frames.map((f) => f.ms),
      );
      expect(doc.cels.get(doc.frames[0]!.id)?.size).toBe(1);
      if (frames.frames.length > 1 || asset.clips.length > 1)
        expect(doc.tags?.map((t) => t.name)).toEqual(
          asset.clips.map((c) => c.name),
        );
      expect(doc.slices.length).toBe(asset.slices?.length ?? 0);
      for (const slice of doc.slices)
        if (slice.center) expect(slice.center.w).toBeGreaterThan(0);
    },
  );

  it.each(assets)("%s has pixels in every frame", (_, asset) => {
    for (const { sprite } of framesOf(asset).frames)
      expect(sprite.data.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  });

  it("writes PNG sheets with the frames side by side", () => {
    const asset = PACKS[0]!.assets.find((a) => a.id === "coin")!;
    const sheet = sheetOf(framesOf(asset));
    const png = encodePng(sheet.w, sheet.h, sheet.data);
    const view = new DataView(png.buffer);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([16 * 6, 16]);
    const idatLength = view.getUint32(33);
    expect(new TextDecoder().decode(png.subarray(37, 41))).toBe("IDAT");
    const raw = unzlibSync(png.subarray(41, 41 + idatLength));
    expect(raw.length).toBe(sheet.h * (sheet.w * 4 + 1));
  });
});
