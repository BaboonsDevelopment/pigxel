import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assetFileUrl, assetIdFor } from "@/features/assets/assets";
import { isAssetBackground } from "@/features/assets/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, PREMIUM_BUCKET } from "../../../scripts/assets/lib/remote.ts";
import { ReviewError } from "./server";
import type {
  ProductionAsset,
  ProductionCatalog,
  ProductionPack,
  ProductionTag,
} from "./types";

/*
 * What's on the Assets page, managed from the In production tab. Once an
 * asset is published, the database owns its pack, place and premium: import.ts
 * sets them only for new assets. Asset rows keep their updated_at here, since
 * the review tool reads it as when the art was last published.
 */

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME_MAX = 40;
const DESCRIPTION_MAX = 400;
const MAX_BATCH = 500;

type PackRow = {
  id: string;
  name: string;
  description: string | null;
  background: string | null;
  premium: boolean;
};

type AssetRow = {
  id: string;
  name: string;
  pack_id: string;
  kind: "sprite" | "tile";
  width: number;
  height: number;
  frame_count: number;
  frame_ms: number;
  premium: boolean;
  sheet_path: string;
  asset_tag_links: { tag_id: string }[];
};

function fail(message: string, error?: { message: string } | null): never {
  if (error) console.error(`${message} ${error.message}`);
  throw new Error(message);
}

function packId(id: unknown) {
  if (typeof id !== "string" || !ID.test(id))
    throw new ReviewError("No such pack.", 404);
  return id;
}

function assetIds(ids: unknown) {
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > MAX_BATCH ||
    !ids.every((id) => typeof id === "string" && ID.test(id))
  )
    throw new ReviewError("Pick the assets to change.");
  return [...new Set(ids as string[])];
}

function tagIds(ids: unknown) {
  if (ids === undefined) return [];
  if (
    !Array.isArray(ids) ||
    !ids.every((id) => typeof id === "string" && ID.test(id))
  )
    throw new ReviewError("Unknown tag.");
  return [...new Set(ids as string[])];
}

function cleanName(value: unknown, what: string) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || name.length > NAME_MAX)
    throw new ReviewError(
      `Give the ${what} a name of up to ${NAME_MAX} characters.`,
    );
  return name;
}

function cleanDescription(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new ReviewError("Invalid description.");
  const text = value.trim();
  if (text.length > DESCRIPTION_MAX)
    throw new ReviewError(
      `Keep the description under ${DESCRIPTION_MAX} characters.`,
    );
  return text || null;
}

export async function productionCatalog(): Promise<ProductionCatalog> {
  const supabase = createAdminClient();
  const [packs, assets, tags] = await Promise.all([
    supabase
      .from("asset_packs")
      .select("id, name, description, background, premium")
      .order("sort")
      .order("name")
      .returns<PackRow[]>(),
    supabase
      .from("assets")
      .select(
        "id, name, pack_id, kind, width, height, frame_count, frame_ms, premium, sheet_path, asset_tag_links(tag_id)",
      )
      .order("pack_id")
      .order("sort")
      .order("name")
      .returns<AssetRow[]>(),
    supabase
      .from("asset_tags")
      .select("id, name")
      .order("sort")
      .order("name")
      .returns<ProductionTag[]>(),
  ]);
  const error = packs.error ?? assets.error ?? tags.error;
  if (error) fail("Couldn’t read production.", error);
  return {
    packs: packs.data!.map((row): ProductionPack => ({
      id: row.id,
      name: row.name,
      description: row.description,
      background: row.background,
      premium: row.premium,
    })),
    assets: assets.data!.map((row): ProductionAsset => ({
      id: row.id,
      name: row.name,
      packId: row.pack_id,
      kind: row.kind,
      width: row.width,
      height: row.height,
      frames: row.frame_count,
      frameMs: row.frame_ms,
      premium: row.premium,
      sheetUrl: assetFileUrl(row.sheet_path),
      tags: row.asset_tag_links.map((link) => link.tag_id),
    })),
    tags: tags.data!,
  };
}

/** Adds an empty pack at the end; it shows on the Assets page once it has assets. */
export async function createPack(details: {
  name?: unknown;
  description?: unknown;
}): Promise<ProductionPack> {
  const name = cleanName(details.name, "pack");
  const description = cleanDescription(details.description);
  const id = assetIdFor(name);
  if (!id) throw new ReviewError("Use some letters or numbers in the name.");
  const supabase = createAdminClient();
  const { data: last, error: sortError } = await supabase
    .from("asset_packs")
    .select("sort")
    .order("sort", { ascending: false })
    .limit(1)
    .returns<{ sort: number }[]>();
  if (sortError) fail("Couldn’t add the pack.", sortError);
  const { error } = await supabase.from("asset_packs").insert({
    id,
    name,
    description,
    sort: (last?.[0]?.sort ?? -1) + 1,
  });
  if (error?.code === "23505")
    throw new ReviewError(`There's already a pack called “${id}”.`, 409);
  if (error) fail("Couldn’t add the pack.", error);
  return { id, name, description, background: null, premium: false };
}

/**
 * Changes a pack's name, description, colour or premium. Premium moves each
 * asset's .pigxel file to the private bucket (or back) before the pack
 * changes, so a failure part-way can simply be retried.
 */
export async function updatePack(
  id: unknown,
  details: {
    name?: unknown;
    description?: unknown;
    background?: unknown;
    premium?: unknown;
  },
) {
  const pack = packId(id);
  const patch: Record<string, unknown> = {};
  if (details.name !== undefined) patch.name = cleanName(details.name, "pack");
  if (details.description !== undefined)
    patch.description = cleanDescription(details.description);
  if (details.background !== undefined) {
    if (details.background !== null && !isAssetBackground(details.background))
      throw new ReviewError("Pick one of the background colours.");
    patch.background = details.background;
  }
  if (details.premium !== undefined && typeof details.premium !== "boolean")
    throw new ReviewError("premium must be true or false.");

  const supabase = createAdminClient();
  if (typeof details.premium === "boolean") {
    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, file_path, premium")
      .eq("pack_id", pack)
      .returns<PremiumRow[]>();
    if (error) fail("Couldn’t read the pack’s assets.", error);
    for (const asset of assets!)
      await setAssetPremium(supabase, asset, details.premium);
    patch.premium = details.premium;
  }
  if (!Object.keys(patch).length) return;
  const { data, error } = await supabase
    .from("asset_packs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", pack)
    .select("id");
  if (error) fail("Couldn’t save the pack.", error);
  if (!data!.length) throw new ReviewError("No such pack.", 404);
}

/** Removes a pack with no assets left in it. */
export async function deletePack(id: unknown) {
  const pack = packId(id);
  const supabase = createAdminClient();
  const { count, error: countError } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("pack_id", pack);
  if (countError) fail("Couldn’t delete the pack.", countError);
  if (count) throw new ReviewError("Move its assets out first.", 409);
  const { data, error } = await supabase
    .from("asset_packs")
    .delete()
    .eq("id", pack)
    .select("id");
  // An asset added between the count and the delete still blocks it here.
  if (error?.code === "23503")
    throw new ReviewError("Move its assets out first.", 409);
  if (error) fail("Couldn’t delete the pack.", error);
  if (!data!.length) throw new ReviewError("No such pack.", 404);
}

type PremiumRow = { id: string; file_path: string; premium: boolean };

/** Moves an asset's .pigxel file to the bucket its premium needs, then its row. */
async function setAssetPremium(
  supabase: SupabaseClient,
  asset: PremiumRow,
  premium: boolean,
  extra: Record<string, unknown> = {},
) {
  if (asset.premium !== premium) {
    const from = premium ? BUCKET : PREMIUM_BUCKET;
    const to = premium ? PREMIUM_BUCKET : BUCKET;
    const move = await supabase.storage
      .from(from)
      .move(asset.file_path, asset.file_path, { destinationBucket: to });
    if (move.error && !(await existsIn(supabase, to, asset.file_path)))
      fail(`Couldn’t move “${asset.id}”’s file. Try again.`, move.error);
  }
  const patch = { ...extra, premium };
  if (asset.premium === premium && !Object.keys(extra).length) return;
  const { error } = await supabase
    .from("assets")
    .update(patch)
    .eq("id", asset.id);
  if (error) fail(`Couldn’t save “${asset.id}”. Try again.`, error);
}

/** Whether a file is already where a move would put it (an earlier try). */
async function existsIn(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
) {
  const slash = path.lastIndexOf("/");
  const { data } = await supabase.storage
    .from(bucket)
    .list(path.slice(0, slash), { search: path.slice(slash + 1) });
  return !!data?.some((file) => file.name === path.slice(slash + 1));
}

/**
 * Moves assets to the end of another pack. They take its premium, so their
 * files move bucket when it differs.
 */
export async function moveAssets(ids: unknown, target: unknown) {
  const list = assetIds(ids);
  const pack = packId(target);
  const supabase = createAdminClient();
  const [packRow, last, assets] = await Promise.all([
    supabase
      .from("asset_packs")
      .select("premium")
      .eq("id", pack)
      .maybeSingle<{ premium: boolean }>(),
    supabase
      .from("assets")
      .select("sort")
      .eq("pack_id", pack)
      .order("sort", { ascending: false })
      .limit(1)
      .returns<{ sort: number }[]>(),
    supabase
      .from("assets")
      .select("id, file_path, premium, pack_id")
      .in("id", list)
      .order("pack_id")
      .order("sort")
      .returns<(PremiumRow & { pack_id: string })[]>(),
  ]);
  const error = packRow.error ?? last.error ?? assets.error;
  if (error) fail("Couldn’t move the assets.", error);
  if (!packRow.data) throw new ReviewError("No such pack.", 404);
  let sort = (last.data?.[0]?.sort ?? -1) + 1;
  for (const asset of assets.data!.filter((a) => a.pack_id !== pack))
    await setAssetPremium(supabase, asset, packRow.data.premium, {
      pack_id: pack,
      sort: sort++,
    });
}

/** Adds and removes tags on each of these assets. */
export async function tagAssets(
  ids: unknown,
  changes: { add?: unknown; remove?: unknown },
) {
  const list = assetIds(ids);
  const add = tagIds(changes.add);
  const remove = tagIds(changes.remove).filter((tag) => !add.includes(tag));
  const supabase = createAdminClient();
  if (remove.length) {
    const { error } = await supabase
      .from("asset_tag_links")
      .delete()
      .in("asset_id", list)
      .in("tag_id", remove);
    if (error) fail("Couldn’t save the tags.", error);
  }
  if (add.length) {
    const { error } = await supabase.from("asset_tag_links").upsert(
      list.flatMap((asset_id) => add.map((tag_id) => ({ asset_id, tag_id }))),
      { ignoreDuplicates: true },
    );
    if (error?.code === "23503")
      throw new ReviewError("That asset or tag is gone. Refresh and retry.");
    if (error) fail("Couldn’t save the tags.", error);
  }
}

/** Adds a tag to the fixed list; its id comes from its name. */
export async function createTag(name: unknown): Promise<ProductionTag> {
  const clean = cleanName(name, "tag");
  const id = assetIdFor(clean);
  if (!id) throw new ReviewError("Use some letters or numbers in the name.");
  const supabase = createAdminClient();
  const { data: last, error: sortError } = await supabase
    .from("asset_tags")
    .select("sort")
    .order("sort", { ascending: false })
    .limit(1)
    .returns<{ sort: number }[]>();
  if (sortError) fail("Couldn’t add the tag.", sortError);
  const { error } = await supabase
    .from("asset_tags")
    .upsert(
      { id, name: clean, sort: (last?.[0]?.sort ?? -1) + 1 },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) fail("Couldn’t add the tag.", error);
  return { id, name: clean };
}

/** Puts assets first in their pack, in the order given, to lead its collage. */
export async function moveAssetsToFront(ids: unknown) {
  const list = assetIds(ids);
  const supabase = createAdminClient();
  const { data: assets, error } = await supabase
    .from("assets")
    .select("id, pack_id")
    .in("id", list)
    .returns<{ id: string; pack_id: string }[]>();
  if (error) fail("Couldn’t move them.", error);
  const byPack = new Map<string, string[]>();
  for (const asset of assets!)
    byPack.set(asset.pack_id, [...(byPack.get(asset.pack_id) ?? []), asset.id]);
  for (const [pack, members] of byPack) {
    const { data: first, error: sortError } = await supabase
      .from("assets")
      .select("sort")
      .eq("pack_id", pack)
      .order("sort")
      .limit(1)
      .returns<{ sort: number }[]>();
    if (sortError) fail("Couldn’t move them.", sortError);
    const start = (first?.[0]?.sort ?? 0) - members.length;
    const ordered = list.filter((id) => members.includes(id));
    for (const [i, id] of ordered.entries()) {
      const { error: moveError } = await supabase
        .from("assets")
        .update({ sort: start + i })
        .eq("id", id);
      if (moveError) fail("Couldn’t move them.", moveError);
    }
  }
}
