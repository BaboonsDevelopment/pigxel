/**
 * Renders assets big enough to look at: one PNG per asset with each clip's
 * frames scaled up on a checkerboard (and tiles repeated 3×3), plus a
 * contact sheet of everything. Prints the paths it wrote.
 *
 *   node scripts/assets/render.ts [--pack id] [--only asset-id] [--scale 8]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { encodePng } from "./lib/png.ts";
import { assetPreview, contactSheet } from "./lib/render.ts";
import { loadPacks } from "./lib/source.ts";
import type { Sprite } from "./lib/sprite.ts";

const { values } = parseArgs({
  options: {
    out: {
      type: "string",
      default: join(import.meta.dirname, "out", "render"),
    },
    pack: { type: "string", multiple: true },
    only: { type: "string", multiple: true },
    scale: { type: "string", default: "8" },
  },
});

const scale = Number(values.scale);
if (!Number.isInteger(scale) || scale < 1)
  throw new Error("--scale must be a whole number");

const write = (file: string, s: Sprite) => {
  writeFileSync(file, encodePng(s.w, s.h, s.data));
  console.log(file);
};

const assets = loadPacks()
  .filter((pack) => !values.pack?.length || values.pack.includes(pack.id))
  .flatMap((pack) => pack.assets)
  .filter((asset) => !values.only?.length || values.only.includes(asset.id));

const drawn = [];
for (const asset of assets) {
  if (!asset.def) {
    console.error(`${asset.key}: can't render, run assets:check`);
    process.exitCode = 1;
    continue;
  }
  const dir = join(values.out!, asset.pack);
  mkdirSync(dir, { recursive: true });
  write(join(dir, `${asset.id}.png`), assetPreview(asset.def, scale));
  drawn.push(asset.def);
}
if (drawn.length > 1) {
  mkdirSync(values.out!, { recursive: true });
  write(join(values.out!, "contact.png"), contactSheet(drawn));
}
