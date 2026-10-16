"use server";

import { requireUser } from "@/lib/auth/session";
import type { Asset } from "./assets";
import { createClient } from "@/lib/supabase/server";
import { cleanFilters, type AssetFilters } from "./filters";
import {
  listAssetFavourites,
  listAssetPage,
  listAssets,
  listAssetTags,
  listPackCards,
  type AssetTag,
  type PackCard,
} from "./server";

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A page of the All assets grid, for scrolling further. */
export async function loadAssetPage(
  filters: AssetFilters,
  from: number,
): Promise<{ assets: Asset[]; count: number }> {
  const user = await requireUser();
  if (!Number.isInteger(from) || from < 0) return { assets: [], count: 0 };
  return listAssetPage(user.id, cleanFilters(filters), from);
}

export async function setAssetFavourite(
  id: string,
  on: boolean,
): Promise<{ error?: string }> {
  await requireUser();
  if (!ID.test(id)) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = on
    ? await supabase
        .from("asset_favourites")
        .upsert({ asset_id: id }, { ignoreDuplicates: true })
    : await supabase.from("asset_favourites").delete().eq("asset_id", id);
  return error ? { error: "Couldn’t save that. Try again." } : {};
}

export async function setPackFavourite(
  id: string,
  on: boolean,
): Promise<{ error?: string }> {
  await requireUser();
  if (!ID.test(id)) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = on
    ? await supabase
        .from("asset_pack_favourites")
        .upsert({ pack_id: id }, { ignoreDuplicates: true })
    : await supabase.from("asset_pack_favourites").delete().eq("pack_id", id);
  return error ? { error: "Couldn’t save that. Try again." } : {};
}

/**
 * Notes that the signed-in person started a tile from an asset, downloaded
 * or copied it: for Recently used and Popular. Never fails loudly.
 */
export async function recordAssetUse(
  id: string,
  kind: "start" | "download" | "copy",
): Promise<void> {
  await requireUser();
  if (!ID.test(id) || !["start", "download", "copy"].includes(kind)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_asset_use", {
    p_asset: id,
    p_kind: kind,
  });
  if (error) console.error("Couldn’t record the asset use:", error.message);
}

/** Every asset of a pack, for its ZIP; premium files only with a plan. */
export async function loadPackAssets(packId: string): Promise<Asset[]> {
  await requireUser();
  if (!ID.test(packId)) return [];
  return (await listAssets(packId, 1000)).assets;
}

/** What the editor's asset picker needs to browse like the Assets page. */
export async function loadAssetLibrary(): Promise<{
  packs: PackCard[];
  tags: AssetTag[];
  favourites: { assets: string[]; packs: string[] };
}> {
  const user = await requireUser();
  const [packs, tags, favourites] = await Promise.all([
    listPackCards(),
    listAssetTags(),
    listAssetFavourites(user.id),
  ]);
  return { packs, tags, favourites };
}
