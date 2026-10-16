/**
 * Builds what can ship: every asset approved in review (for the drawing as
 * it is now) with no errors, as a `.pigxel` file and a PNG sheet (frames
 * side by side), plus `manifest.json` for `import.ts` to upload.
 *
 *   node scripts/assets/build.ts [--out dir] [--pack id] [--all]
 *
 * --all also builds assets nobody has approved yet, to try them locally.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { hasErrors, issuesOf } from "./lib/checks.ts";
import { framesOf, paletteOf, pigxelFile, sheetOf } from "./lib/pigxel.ts";
import { encodePng } from "./lib/png.ts";
import { readReviews, reviewState } from "./lib/review.ts";
import { isPremium, loadPacks } from "./lib/source.ts";

const { values } = parseArgs({
  options: {
    out: { type: "string", default: join(import.meta.dirname, "out") },
    pack: { type: "string", multiple: true },
    all: { type: "boolean", default: false },
  },
});

const reviews = readReviews();
const packs = loadPacks().filter(
  (pack) => !values.pack?.length || values.pack.includes(pack.id),
);
if (values.pack?.length && !packs.length)
  throw new Error(`No pack named ${values.pack.join(", ")}`);

const out = values.out!;
rmSync(join(out, "manifest.json"), { force: true });
for (const pack of packs)
  rmSync(join(out, pack.id), { recursive: true, force: true });

const skipped: string[] = [];
const manifest = {
  generated: "node scripts/assets/build.ts",
  packs: packs.map((pack) => {
    if (pack.issues.length)
      throw new Error(`${pack.id}/pack.json: ${pack.issues[0]!.message}`);
    const dir = join(out, pack.id);
    mkdirSync(dir, { recursive: true });
    const assets = pack.assets.flatMap((source, sort) => {
      const state = reviewState(source, reviews[source.key]);
      const asset = source.def;
      if (!asset || hasErrors(issuesOf(source, pack))) {
        skipped.push(`${source.key} (errors)`);
        return [];
      }
      if (state !== "approved" && !values.all) {
        skipped.push(`${source.key} (${state})`);
        return [];
      }
      const frames = framesOf(asset);
      const sheet = sheetOf(frames);
      writeFileSync(join(dir, `${asset.id}.pigxel`), pigxelFile(asset, frames));
      writeFileSync(
        join(dir, `${asset.id}.png`),
        encodePng(sheet.w, sheet.h, sheet.data),
      );
      return [
        {
          id: asset.id,
          name: asset.name,
          category: pack.block ?? pack.id,
          kind: asset.kind,
          tags: asset.tags,
          tier: pack.tier,
          premium: isPremium(pack, asset.id),
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
        },
      ];
    });
    const palettes = pack.palettes.map((palette) => {
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
      block: pack.block ?? pack.id,
      newBlock: !pack.block,
      background: pack.background,
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

const count = (key: "assets" | "palettes") =>
  manifest.packs.reduce((n, pack) => n + pack[key].length, 0);
console.log(
  `Built ${count("assets")} assets and ${count("palettes")} palettes in ${packs.length} packs to ${out}`,
);
if (skipped.length) console.log(`Skipped: ${skipped.join(", ")}`);
