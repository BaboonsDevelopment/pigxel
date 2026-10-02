import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  ASSET_COLUMNS,
  toAsset,
  type Asset,
  type AssetCategory,
  type AssetRow,
} from "./assets";

/** Assets in a category (or all), first by their sort order then by name, with how many there are. */
export async function listAssets(
  category: AssetCategory | null,
  limit: number,
): Promise<{ assets: Asset[]; total: number }> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("assets")
      .select(ASSET_COLUMNS, { count: "exact" });
    if (category) query = query.eq("category", category);
    const { data, count, error } = await query
      .order("sort")
      .order("name")
      .limit(limit)
      .returns<AssetRow[]>();
    if (error || !data) return { assets: [], total: 0 };
    return { assets: data.map(toAsset), total: count ?? data.length };
  } catch {
    return { assets: [], total: 0 };
  }
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
    return data ? toAsset(data) : null;
  } catch {
    return null;
  }
}
