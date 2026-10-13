import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ASSETS_DIR } from "./paths.ts";
import { PALETTE_PRESETS } from "../../../src/lib/palette/presets.ts";
import type {
  AssetDef,
  Clip,
  AssetKind,
  PaletteDef,
  SliceDef,
  Tier,
} from "./asset.ts";
import { put, sprite } from "./sprite.ts";

/**
 * Assets are drawn by hand (by people or Claude Code) as JSON pixel grids:
 * `packs/<pack>/pack.json` names the pack, its palette and style, and lists
 * its assets in order; `packs/<pack>/<asset>.json` is one asset.
 */
export const PACKS_DIR = join(ASSETS_DIR, "packs");

export type Issue = {
  level: "error" | "warning";
  rule: string;
  message: string;
};

export type PackStyle = {
  /** The outline colour sprites use; tiles have none. */
  outline?: string;
  /** Most colours one asset may use. */
  maxColors: number;
};

export type AssetSource = {
  /** `<pack>/<id>`, the key reviews are kept under. */
  key: string;
  pack: string;
  id: string;
  file: string;
  /** Changes whenever the drawing does, so approvals go stale. */
  hash: string;
  def: AssetDef | null;
  issues: Issue[];
};

export type PackSource = {
  id: string;
  name: string;
  tier: Tier;
  block: string | null;
  premium: string[];
  description: string;
  palette: string[];
  style: PackStyle;
  palettes: PaletteDef[];
  assets: AssetSource[];
  issues: Issue[];
};

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-f]{6}$/;
const KINDS: AssetKind[] = ["sprite", "tile"];
export const MAX_SIDE = 256;
export const MAX_FRAMES = 64;
export const MAX_COLORS = 32;

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isInt = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;

const hashOf = (text: string) =>
  createHash("sha256").update(text).digest("hex").slice(0, 16);

function issueList() {
  const issues: Issue[] = [];
  return {
    issues,
    error: (rule: string, message: string) =>
      issues.push({ level: "error", rule, message }),
    warn: (rule: string, message: string) =>
      issues.push({ level: "warning", rule, message }),
  };
}

function presetColors(id: string) {
  return PALETTE_PRESETS.find((p) => p.id === id);
}

export function parseAsset(
  json: unknown,
  fileId: string,
): { def: AssetDef | null; issues: Issue[] } {
  const { issues, error, warn } = issueList();
  if (!isObject(json)) {
    error("schema", "The file must hold one JSON object.");
    return { def: null, issues };
  }
  const { id, name, kind, tags = [], colors, clips, slices = [] } = json;
  if (id !== fileId)
    error("schema", `id must be "${fileId}", the same as the file name.`);
  if (typeof id !== "string" || !ID.test(id) || id.length > 40)
    error("schema", "id must be kebab-case and at most 40 characters.");
  if (typeof name !== "string" || !name.trim() || name.trim().length > 40)
    error("schema", "name must be 1–40 characters.");
  if (!KINDS.includes(kind as AssetKind))
    error("schema", `kind must be one of ${KINDS.join(", ")}.`);
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string"))
    error("schema", "tags must be a list of strings.");
  if (json.notes !== undefined && typeof json.notes !== "string")
    error("schema", "notes must be a string.");
  if (!isObject(colors)) error("schema", "colors must map keys to colours.");
  else
    for (const [key, value] of Object.entries(colors)) {
      if (key.length !== 1 || key === ".")
        error("schema", `Colour key "${key}" must be one character, not ".".`);
      if (typeof value !== "string" || !HEX.test(value))
        error("schema", `Colour "${key}" must be lowercase #rrggbb.`);
    }
  if (!Array.isArray(clips) || !clips.length)
    error("schema", "clips must list at least one clip.");
  if (issues.length) return { def: null, issues };

  const palette = colors as Record<string, string>;
  const used = new Set<string>();
  let size: { w: number; h: number } | null = null;
  const parsed: Clip[] = [];
  for (const [ci, clip] of (clips as unknown[]).entries()) {
    if (!isObject(clip) || typeof clip.name !== "string" || !clip.name) {
      error("schema", `Clip ${ci + 1} needs a name.`);
      continue;
    }
    const label = `Clip "${clip.name}"`;
    if (clip.kind !== "animation" && clip.kind !== "variant")
      error("schema", `${label}: kind must be "animation" or "variant".`);
    if (clip.ms !== undefined && !isInt(clip.ms, 1, 65535))
      error("schema", `${label}: ms must be a whole number of milliseconds.`);
    if (
      clip.direction !== undefined &&
      clip.direction !== "forward" &&
      clip.direction !== "pingpong"
    )
      error("schema", `${label}: direction must be "forward" or "pingpong".`);
    if (!Array.isArray(clip.frames) || !clip.frames.length) {
      error("schema", `${label}: frames must list at least one frame.`);
      continue;
    }
    const frames = [];
    for (const [fi, rows] of (clip.frames as unknown[]).entries()) {
      const where = `${label} frame ${fi + 1}`;
      if (
        !Array.isArray(rows) ||
        !rows.length ||
        rows.some((r) => typeof r !== "string")
      ) {
        error("schema", `${where}: must be a list of row strings.`);
        continue;
      }
      const lines = rows as string[];
      const w = lines[0]!.length;
      if (lines.some((row) => row.length !== w)) {
        const lengths = [...new Set(lines.map((row) => row.length))];
        error("grid", `${where}: rows have different lengths (${lengths}).`);
        continue;
      }
      size ??= { w, h: lines.length };
      if (w !== size.w || lines.length !== size.h) {
        error(
          "grid",
          `${where}: is ${w}×${lines.length}, the first frame is ${size.w}×${size.h}.`,
        );
        continue;
      }
      const unknown = new Set<string>();
      const s = sprite(w, lines.length);
      lines.forEach((row, y) => {
        for (let x = 0; x < w; x++) {
          const key = row[x]!;
          if (key === ".") continue;
          const color = palette[key];
          if (!color) unknown.add(key);
          else {
            used.add(key);
            put(s, x, y, color);
          }
        }
      });
      if (unknown.size)
        error("grid", `${where}: no colour for ${[...unknown].join(" ")}.`);
      frames.push(s);
    }
    parsed.push({
      name: clip.name,
      kind: clip.kind as Clip["kind"],
      frames,
      ...(clip.ms !== undefined && { ms: clip.ms as number }),
      ...(clip.direction !== undefined && {
        direction: clip.direction as Clip["direction"],
      }),
    });
  }
  if (size && (size.w > MAX_SIDE || size.h > MAX_SIDE))
    error("size", `At most ${MAX_SIDE}×${MAX_SIDE} pixels.`);
  const frameCount = parsed.reduce((n, c) => n + c.frames.length, 0);
  if (frameCount > MAX_FRAMES)
    error("size", `${frameCount} frames; at most ${MAX_FRAMES}.`);
  const unused = Object.keys(palette).filter((key) => !used.has(key));
  if (unused.length)
    warn("colors", `Colour keys never used: ${unused.join(" ")}.`);

  const parsedSlices: SliceDef[] = [];
  if (!Array.isArray(slices)) error("schema", "slices must be a list.");
  else
    for (const slice of slices as unknown[]) {
      const ok =
        isObject(slice) &&
        typeof slice.name === "string" &&
        size &&
        isInt(slice.x, 0, size.w - 1) &&
        isInt(slice.y, 0, size.h - 1) &&
        isInt(slice.w, 1, size.w - (slice.x as number)) &&
        isInt(slice.h, 1, size.h - (slice.y as number)) &&
        (slice.border === undefined ||
          isInt(
            slice.border,
            1,
            Math.min(slice.w as number, slice.h as number) / 2,
          ));
      if (!ok)
        error(
          "schema",
          "Each slice needs a name and x, y, w, h inside the canvas.",
        );
      else parsedSlices.push(slice as SliceDef);
    }

  if (issues.some((i) => i.level === "error")) return { def: null, issues };
  return {
    def: {
      id: id as string,
      name: (name as string).trim(),
      kind: kind as AssetKind,
      tags: tags as string[],
      clips: parsed,
      slices: parsedSlices,
      ...(typeof json.notes === "string" && { notes: json.notes }),
    },
    issues,
  };
}

function loadAsset(dir: string, pack: string, id: string): AssetSource {
  const file = join(dir, `${id}.json`);
  const text = readFileSync(file, "utf8");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return {
      key: `${pack}/${id}`,
      pack,
      id,
      file,
      hash: hashOf(text),
      def: null,
      issues: [
        {
          level: "error",
          rule: "schema",
          message: `Not valid JSON: ${e instanceof Error ? e.message : e}`,
        },
      ],
    };
  }
  return {
    key: `${pack}/${id}`,
    pack,
    id,
    file,
    hash: hashOf(JSON.stringify(json)),
    ...parseAsset(json, id),
  };
}

function loadPack(dir: string, dirName: string): PackSource {
  const { issues, error } = issueList();
  const json: unknown = JSON.parse(
    readFileSync(join(dir, "pack.json"), "utf8"),
  );
  if (!isObject(json)) throw new Error(`${dirName}/pack.json: not an object`);
  if (json.id !== dirName)
    error("pack", `pack.json id must be "${dirName}", the folder's name.`);
  if (json.tier !== "free" && json.tier !== "paid")
    error("pack", `tier must be "free" or "paid".`);
  if (
    json.block !== undefined &&
    (typeof json.block !== "string" || !ID.test(json.block))
  )
    error("pack", "block must be the id of a block on the Assets page.");

  let palette: string[] = [];
  if (typeof json.palette === "string") {
    const preset = presetColors(json.palette);
    if (!preset) error("pack", `No palette preset "${json.palette}".`);
    else palette = preset.colors.map((c) => c.toLowerCase());
  } else if (
    Array.isArray(json.palette) &&
    json.palette.every((c) => typeof c === "string" && HEX.test(c))
  )
    palette = json.palette as string[];
  else error("pack", "palette must be a preset id or a list of #rrggbb.");

  const style = isObject(json.style) ? json.style : {};
  const maxColors = isInt(style.maxColors, 2, MAX_COLORS)
    ? (style.maxColors as number)
    : MAX_COLORS;
  const outline =
    typeof style.outline === "string" && HEX.test(style.outline)
      ? style.outline
      : undefined;
  if (outline && !palette.includes(outline))
    error("pack", `The outline ${outline} isn't in the pack's palette.`);

  const palettes = (Array.isArray(json.palettes) ? json.palettes : []).map(
    (id) => {
      const preset = presetColors(String(id));
      if (!preset) {
        error("pack", `No palette preset "${id}".`);
        return null;
      }
      return {
        id: preset.id,
        name: preset.name,
        author: preset.author,
        colors: preset.colors,
        tags: ["palette"],
        preset: preset.id,
      } satisfies PaletteDef;
    },
  );

  const listed = Array.isArray(json.assets) ? json.assets.map(String) : [];
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "pack.json")
    .map((f) => f.slice(0, -".json".length));
  for (const file of files)
    if (!listed.includes(file))
      error("pack", `${file}.json isn't listed in pack.json "assets".`);
  const premium = Array.isArray(json.premium)
    ? json.premium.map(String).filter((id) => listed.includes(id))
    : [];
  const assets = listed.flatMap((id) => {
    if (!existsSync(join(dir, `${id}.json`))) {
      error("pack", `pack.json lists "${id}", but ${id}.json is missing.`);
      return [];
    }
    return [loadAsset(dir, dirName, id)];
  });

  return {
    id: dirName,
    name: typeof json.name === "string" ? json.name : dirName,
    tier: json.tier === "paid" ? "paid" : "free",
    block: typeof json.block === "string" ? json.block : null,
    premium,
    description: typeof json.description === "string" ? json.description : "",
    palette,
    style: { outline, maxColors },
    palettes: palettes.filter((p) => p !== null),
    assets,
    issues,
  };
}

/** Every pack under `dir`, with any problems found reading it. */
export function loadPacks(dir = PACKS_DIR): PackSource[] {
  const packs = readdirSync(dir, { withFileTypes: true })
    .filter(
      (d) => d.isDirectory() && existsSync(join(dir, d.name, "pack.json")),
    )
    .map((d) => loadPack(join(dir, d.name), d.name))
    .sort((a, b) => a.id.localeCompare(b.id));
  const seen = new Map<string, string>();
  for (const pack of packs)
    for (const asset of pack.assets) {
      const other = seen.get(asset.id);
      if (other)
        asset.issues.push({
          level: "error",
          rule: "schema",
          message: `id "${asset.id}" is also used in ${other}; ids are shared across packs.`,
        });
      seen.set(asset.id, asset.key);
    }
  return packs;
}

export const isPremium = (
  pack: Pick<PackSource, "tier" | "premium">,
  id: string,
) => pack.tier === "paid" || pack.premium.includes(id);

export function updatePack(
  id: string,
  change: (json: Json) => void,
  dir = PACKS_DIR,
) {
  const file = join(dir, id, "pack.json");
  const json: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!isObject(json)) throw new Error(`${id}/pack.json: not an object`);
  change(json);
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
}
