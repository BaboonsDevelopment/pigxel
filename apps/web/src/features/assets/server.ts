import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  ASSET_BLOCK_COLUMNS,
  ASSET_COLUMNS,
  toAssetBlock,
  toAssets,
  type Asset,
  type AssetBlock,
  type AssetBlockRow,
  type AssetRow,
} from "./assets";

/** Throws when the catalog can't be loaded. */
export async function listAssets(
  category: string | null,
  limit: number,
): Promise<{ assets: Asset[]; total: number }> {
  const supabase = await createClient();
  let query = supabase.from("assets").select(ASSET_COLUMNS, { count: "exact" });
  if (category) query = query.eq("category", category);
  const { data, count, error } = await query
    .order("sort")
    .order("name")
    .limit(limit)
    .returns<AssetRow[]>();
  if (error) throw new Error(`Couldn’t load assets: ${error.message}`);
  return {
    assets: await toAssets(supabase, data),
    total: count ?? data.length,
  };
}

export async function listAssetBlocks(): Promise<AssetBlock[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asset_blocks")
    .select(ASSET_BLOCK_COLUMNS)
    .order("sort")
    .order("name")
    .returns<AssetBlockRow[]>();
  if (error) throw new Error(`Couldn’t load asset blocks: ${error.message}`);
  return data.map(toAssetBlock);
}

export async function findAsset(
  id: string | null | undefined,
): Promise<Asset | null> {
  if (!id) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("assets")
      .select(ASSET_COLUMNS)
      .eq("id", id)
      .maybeSingle<AssetRow>();
    return data ? ((await toAssets(supabase, [data]))[0] ?? null) : null;
  } catch {
    return null;
  }
}

/** How many premium assets exist, so admins can import the premium set. */
export async function countPremiumAssets(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("premium", true);
  return count ?? 0;
}
