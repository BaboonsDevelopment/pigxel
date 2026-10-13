/**
 * Loads what `generate.ts` wrote into the Assets page: per asset, its
 * `.pigxel` file and PNG sheet go to the `assets` bucket under names taken
 * from their contents (as Publish to Assets names them), and its row is
 * upserted. Unchanged assets are skipped. Assets not in the manifest are left
 * alone unless --prune, which removes them and their files (including any
 * published from the editor). Writes as the service role, so it needs
 * SUPABASE_SECRET_KEY.
 *
 *   node --env-file=.env.local scripts/assets/import.ts [--dir dir] [--prune] [--dry-run]
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import type { LegacyCategory, Tier } from "./lib/asset.ts";
import { ASSET_BUCKET, fileBucket, isPremium } from "./lib/upload.ts";

const PIGXEL_MIME_TYPE = "application/vnd.pigxel+json";
const CACHE_SECONDS = "31536000";

type ManifestAsset = {
  id: string;
  name: string;
  category: LegacyCategory;
  tier: Tier;
  sort: number;
  width: number;
  height: number;
  frameCount: number;
  frameMs: number;
  colors: string[];
  file: string;
  sheet: string;
};

type Row = {
  id: string;
  name: string;
  category: LegacyCategory;
  width: number;
  height: number;
  frame_count: number;
  frame_ms: number;
  colors: string[];
  file_path: string;
  sheet_path: string;
  sort: number;
  premium: boolean;
};

const { values } = parseArgs({
  options: {
    dir: { type: "string", default: join(import.meta.dirname, "out") },
    "dry-run": { type: "boolean", default: false },
    prune: { type: "boolean", default: false },
  },
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key)
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY, e.g. with --env-file=.env.local",
  );

const dir = values.dir!;
const manifest = JSON.parse(
  readFileSync(join(dir, "manifest.json"), "utf8"),
) as { packs: { assets: ManifestAsset[] }[] };
const assets = manifest.packs.flatMap((pack) => pack.assets);

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const storage = supabase.storage.from(ASSET_BUCKET);

const { data: existing, error: listError } = await supabase
  .from("assets")
  .select(
    "id, name, category, width, height, frame_count, frame_ms, colors, file_path, sheet_path, sort, premium",
  )
  .returns<Row[]>();
if (listError) throw new Error(`Couldn’t read assets: ${listError.message}`);
const before = new Map(existing.map((row) => [row.id, row]));

/** Same as publish.ts: the first 8 bytes of the SHA-256, in hex. */
const hashOf = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex").slice(0, 16);

const counts = { added: 0, updated: 0, unchanged: 0, removed: 0 };
for (const asset of assets) {
  const file = readFileSync(join(dir, asset.file));
  const sheet = readFileSync(join(dir, asset.sheet));
  const row: Row = {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    width: asset.width,
    height: asset.height,
    frame_count: asset.frameCount,
    frame_ms: asset.frameMs,
    colors: asset.colors,
    file_path: `${asset.id}/${hashOf(file)}.pigxel`,
    sheet_path: `${asset.id}/${hashOf(sheet)}.png`,
    sort: asset.sort,
    premium: isPremium(asset.tier),
  };
  const old = before.get(asset.id);
  if (old && JSON.stringify(old) === JSON.stringify(row)) {
    counts.unchanged++;
    continue;
  }
  const action = old ? "updated" : "added";
  counts[action]++;
  console.log(`${values["dry-run"] ? "Would be " : ""}${action}: ${asset.id}`);
  if (values["dry-run"]) continue;

  const options = { cacheControl: CACHE_SECONDS, upsert: true };
  const uploads = await Promise.all([
    supabase.storage.from(fileBucket(row.premium)).upload(row.file_path, file, {
      ...options,
      contentType: PIGXEL_MIME_TYPE,
    }),
    storage.upload(row.sheet_path, sheet, {
      ...options,
      contentType: "image/png",
    }),
  ]);
  const failed = uploads.find((upload) => upload.error);
  if (failed?.error)
    throw new Error(`${asset.id}: couldn’t upload: ${failed.error.message}`);

  const { error } = await supabase
    .from("assets")
    .upsert({ ...row, updated_at: new Date().toISOString() });
  if (error) throw new Error(`${asset.id}: couldn’t save: ${error.message}`);

  if (old?.sheet_path && old.sheet_path !== row.sheet_path)
    await storage.remove([old.sheet_path]);
  // A file that moved bucket (free ⇄ paid) goes from the old one even if
  // its name is the same.
  if (
    old?.file_path &&
    (old.file_path !== row.file_path || old.premium !== row.premium)
  )
    await supabase.storage
      .from(fileBucket(old.premium))
      .remove([old.file_path]);
}

if (values.prune) {
  const keep = new Set(assets.map((a) => a.id));
  for (const row of existing.filter((r) => !keep.has(r.id))) {
    counts.removed++;
    console.log(`${values["dry-run"] ? "Would be " : ""}removed: ${row.id}`);
    if (values["dry-run"]) continue;
    const { error: deleteError } = await supabase
      .from("assets")
      .delete()
      .eq("id", row.id);
    if (deleteError)
      throw new Error(`${row.id}: couldn’t remove: ${deleteError.message}`);
    const { data: files } = await storage.list(row.id);
    const paths = [
      row.file_path,
      row.sheet_path,
      ...(files ?? []).map((f) => `${row.id}/${f.name}`),
    ];
    await storage.remove([...new Set(paths)]);
    if (row.premium)
      await supabase.storage.from(fileBucket(true)).remove([row.file_path]);
  }
}

console.log(
  `${values["dry-run"] ? "Dry run: " : ""}${counts.added} added, ${counts.updated} updated, ${counts.unchanged} unchanged, ${counts.removed} removed`,
);
