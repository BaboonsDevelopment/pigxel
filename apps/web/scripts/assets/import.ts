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
import type { AssetKind } from "./lib/asset.ts";
import { BUCKET, PREMIUM_BUCKET, removeAsset } from "./lib/remote.ts";

const PIGXEL_MIME_TYPE = "application/vnd.pigxel+json";
const CACHE_SECONDS = "31536000";

type ManifestAsset = {
  id: string;
  name: string;
  category: string;
  kind: AssetKind;
  sort: number;
  width: number;
  height: number;
  frameCount: number;
  frameMs: number;
  colors: string[];
  premium: boolean;
  file: string;
  sheet: string;
};

type ManifestPack = {
  id: string;
  name: string;
  block: string;
  newBlock: boolean;
  background: string | null;
  assets: ManifestAsset[];
};

type Row = {
  id: string;
  name: string;
  pack_id: string;
  kind: AssetKind;
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
) as { packs: ManifestPack[] };
const assets = manifest.packs.flatMap((pack) => pack.assets);

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const storage = supabase.storage.from(BUCKET);

const CONNECTION_LIMIT = /too many connections|too many clients|remaining connection slots|connection pool/i;
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000];

async function request<T extends { error: { message: string } | null }>(
  label: string,
  operation: () => PromiseLike<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await operation();
      if (!result.error) return result;
      throw new Error(`${label}: ${result.error.message}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!CONNECTION_LIMIT.test(message) || attempt >= RETRY_DELAYS_MS.length)
        throw error;
      const delay = RETRY_DELAYS_MS[attempt]!;
      console.log(`${message}; retrying in ${delay / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

const existing: Row[] = [];
const PAGE_SIZE = 500;
for (let offset = 0; ; offset += PAGE_SIZE) {
  const { data } = await request("Couldn’t read assets", () =>
    supabase
      .from("assets")
      .select(
        "id, name, pack_id, kind, width, height, frame_count, frame_ms, colors, file_path, sheet_path, sort, premium",
      )
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1)
      .returns<Row[]>(),
  );
  existing.push(...(data ?? []));
  if ((data?.length ?? 0) < PAGE_SIZE) break;
}
const before = new Map(existing.map((row) => [row.id, row]));

const { data: blockRows } = await request("Couldn’t read asset packs", () =>
  supabase
    .from("asset_packs")
    .select("id, sort, premium")
    .returns<{ id: string; sort: number; premium: boolean }[]>(),
);
if (!blockRows) throw new Error("Couldn’t read asset packs.");
const blockIds = new Set(blockRows.map((row) => row.id));
// Premium is set per pack: everything imported into a premium pack is too.
const premiumPacks = new Set(
  blockRows.filter((row) => row.premium).map((row) => row.id),
);
let nextSort = Math.max(-1, ...blockRows.map((row) => row.sort)) + 1;
for (const pack of manifest.packs) {
  if (!pack.assets.length) continue;
  if (!pack.newBlock) {
    if (!blockIds.has(pack.block))
      throw new Error(
        `${pack.id}: there's no block "${pack.block}" to add to.`,
      );
    continue;
  }
  const exists = blockIds.has(pack.block);
  console.log(
    `${values["dry-run"] ? "Would be " : ""}${exists ? "updated" : "added"} pack: ${pack.block} “${pack.name}”`,
  );
  if (values["dry-run"]) continue;
  // An existing pack keeps the name it has: admins rename packs on the
  // Assets page, and pack.json names may still carry their size.
  const packSort = nextSort;
  const savePack = () => exists
    ? supabase
        .from("asset_packs")
        .update({
          ...(pack.background && { background: pack.background }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pack.block)
    : supabase.from("asset_packs").insert({
        id: pack.block,
        name: pack.name,
        sort: packSort,
        ...(pack.background && { background: pack.background }),
      });
  await request(`${pack.block}: couldn’t save the pack`, savePack);
  if (!exists) nextSort++;
  blockIds.add(pack.block);
}

/** Same as publish.ts: the first 8 bytes of the SHA-256, in hex. */
const hashOf = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex").slice(0, 16);

const counts = { added: 0, updated: 0, unchanged: 0, removed: 0 };
const IMPORT_BATCH_SIZE = 1;
const importAsset = async (asset: ManifestAsset) => {
  const file = readFileSync(join(dir, asset.file));
  const sheet = readFileSync(join(dir, asset.sheet));
  const old = before.get(asset.id);
  // Once published, an asset's pack, place and premium are managed in the
  // review tool's In production tab: only new assets take them from here.
  const row: Row = {
    id: asset.id,
    name: asset.name,
    pack_id: old?.pack_id ?? asset.category,
    kind: asset.kind,
    width: asset.width,
    height: asset.height,
    frame_count: asset.frameCount,
    frame_ms: asset.frameMs,
    colors: asset.colors,
    file_path: `${asset.id}/${hashOf(file)}.pigxel`,
    sheet_path: `${asset.id}/${hashOf(sheet)}.png`,
    sort: old?.sort ?? asset.sort,
    premium:
      old?.premium ?? (asset.premium || premiumPacks.has(asset.category)),
  };
  if (old && JSON.stringify(old) === JSON.stringify(row)) {
    counts.unchanged++;
    return;
  }
  const action = old ? "updated" : "added";
  if (!values["dry-run"]) {
    const options = { cacheControl: CACHE_SECONDS, upsert: true };
    await request(`${asset.id}: couldn’t upload`, () =>
      supabase.storage
        .from(row.premium ? PREMIUM_BUCKET : BUCKET)
        .upload(row.file_path, file, {
          ...options,
          contentType: PIGXEL_MIME_TYPE,
        }),
    );
    await request(`${asset.id}: couldn’t upload`, () =>
      storage.upload(row.sheet_path, sheet, {
        ...options,
        contentType: "image/png",
      }),
    );
    await request(`${asset.id}: couldn’t save`, () =>
      supabase
        .from("assets")
        .upsert({ ...row, updated_at: new Date().toISOString() }),
    );

    if (old && old.sheet_path !== row.sheet_path)
      await storage.remove([old.sheet_path]);
    if (old && (old.premium !== row.premium || old.file_path !== row.file_path))
      await supabase.storage
        .from(old.premium ? PREMIUM_BUCKET : BUCKET)
        .remove([old.file_path]);
  }
  counts[action]++;
  console.log(`${values["dry-run"] ? "Would be " : ""}${action}: ${asset.id}`);
};

for (let index = 0; index < assets.length; index += IMPORT_BATCH_SIZE) {
  await importAsset(assets[index]!);
  console.log(
    `Progress: ${Math.min(index + IMPORT_BATCH_SIZE, assets.length)}/${assets.length} checked; ` +
      `${counts.added} added; ${counts.updated} updated; ${counts.unchanged} unchanged`,
  );
}

if (values.prune) {
  const keep = new Set(assets.map((a) => a.id));
  for (const row of existing.filter((r) => !keep.has(r.id))) {
    counts.removed++;
    console.log(`${values["dry-run"] ? "Would be " : ""}removed: ${row.id}`);
    if (values["dry-run"]) continue;
    await removeAsset(supabase, row.id);
  }
}

console.log(
  `${values["dry-run"] ? "Dry run: " : ""}${counts.added} added, ${counts.updated} updated, ${counts.unchanged} unchanged, ${counts.removed} removed`,
);
