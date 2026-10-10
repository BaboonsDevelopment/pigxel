/**
 * Draws every asset pack and writes, per asset, a `.pigxel` file and a PNG
 * sheet (frames side by side), plus `manifest.json` describing packs, tags,
 * tiers and clips for importing into the assets catalog.
 *
 *   node scripts/assets/generate.ts [--out dir] [--pack id]
 *     [--preview file.png [--scale n] [--only asset-id]]
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import type { PackDef } from "./lib/asset.ts";
import { framesOf, paletteOf, pigxelFile, sheetOf } from "./lib/pigxel.ts";
import { encodePng } from "./lib/png.ts";
import { previewSheet } from "./lib/preview.ts";
import { PACKS } from "./packs/index.ts";

const { values } = parseArgs({
  options: {
    out: { type: "string", default: join(import.meta.dirname, "out") },
    preview: { type: "string" },
    pack: { type: "string", multiple: true },
    scale: { type: "string", default: "4" },
    only: { type: "string", multiple: true },
  },
});

const packs: PackDef[] = values.pack?.length
  ? PACKS.filter((pack) => values.pack!.includes(pack.id))
  : PACKS;
if (!packs.length) throw new Error(`No pack named ${values.pack?.join(", ")}`);

const out = values.out!;
rmSync(out, { recursive: true, force: true });

const manifest = {
  generated: "node scripts/assets/generate.ts",
  packs: packs.map((pack) => {
    const dir = join(out, pack.id);
    mkdirSync(dir, { recursive: true });
    const seen = new Set<string>();
    const assets = pack.assets.map((asset, sort) => {
      if (seen.has(asset.id))
        throw new Error(`${pack.id}: duplicate asset id ${asset.id}`);
      seen.add(asset.id);
      const frames = framesOf(asset);
      const sheet = sheetOf(frames);
      writeFileSync(join(dir, `${asset.id}.pigxel`), pigxelFile(asset, frames));
      writeFileSync(
        join(dir, `${asset.id}.png`),
        encodePng(sheet.w, sheet.h, sheet.data),
      );
      return {
        id: asset.id,
        name: asset.name,
        category: asset.category,
        tags: asset.tags,
        tier: pack.tier,
        sort,
        width: frames.w,
        height: frames.h,
        frameCount: frames.frames.length,
        frameMs: frames.frames[0]!.ms,
        clips: frames.tags,
        slices: asset.slices ?? [],
        colors: paletteOf(frames.frames.map((f) => f.sprite)),
        file: `${pack.id}/${asset.id}.pigxel`,
        sheet: `${pack.id}/${asset.id}.png`,
        ...(asset.notes && { notes: asset.notes }),
      };
    });
    const palettes = (pack.palettes ?? []).map((palette) => {
      const gpl = [
        "GIMP Palette",
        `Name: ${palette.name}`,
        `Columns: ${Math.min(16, palette.colors.length)}`,
        "#",
        ...palette.colors.map((hex) => {
          const [r, g, b] = [1, 3, 5].map((i) =>
            parseInt(hex.slice(i, i + 2), 16),
          );
          return `${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${hex}`;
        }),
      ].join("\n");
      writeFileSync(join(dir, `${palette.id}.gpl`), gpl + "\n");
      return {
        ...palette,
        tier: pack.tier,
        file: `${pack.id}/${palette.id}.gpl`,
      };
    });
    return {
      id: pack.id,
      name: pack.name,
      tier: pack.tier,
      description: pack.description,
      assets,
      palettes,
    };
  }),
};
writeFileSync(
  join(out, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);

if (values.preview) {
  const png = previewSheet(packs, Number(values.scale), values.only);
  writeFileSync(values.preview, encodePng(png.w, png.h, png.data));
}

const count = (key: "assets" | "palettes") =>
  manifest.packs.reduce((n, pack) => n + pack[key].length, 0);
console.log(
  `Wrote ${count("assets")} assets and ${count("palettes")} palettes in ${packs.length} packs to ${out}`,
);
