import "server-only";
import { createClient } from "@/lib/supabase/server";
import { cleanSearch } from "@/features/tiles/search";
import {
  ASSET_COLUMNS,
  ASSET_PACK_COLUMNS,
  assetFileUrl,
  toAssetPack,
  toAssets,
  type Asset,
  type AssetPack,
  type AssetPackRow,
  type AssetRow,
} from "./assets";
import { sizeRange, type AssetFilters } from "./filters";

/** Throws when the catalog can't be loaded. */
export async function listAssets(
  packId: string | null,
  limit: number,
): Promise<{ assets: Asset[]; total: number }> {
  const supabase = await createClient();
  let query = supabase.from("assets").select(ASSET_COLUMNS, { count: "exact" });
  if (packId) query = query.eq("pack_id", packId);
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

export async function listAssetPacks(): Promise<AssetPack[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asset_packs")
    .select(ASSET_PACK_COLUMNS)
    .order("sort")
    .order("name")
    .returns<AssetPackRow[]>();
  if (error) throw new Error(`Couldn’t load asset packs: ${error.message}`);
  return data.map(toAssetPack);
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

export type AssetTag = { id: string; name: string };

/** The fixed tag list, in the team's order. Empty when it can't load. */
export async function listAssetTags(): Promise<AssetTag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asset_tags")
    .select("id, name")
    .order("sort")
    .order("name")
    .returns<AssetTag[]>();
  if (error) {
    console.error("Couldn’t load asset tags:", error.message);
    return [];
  }
  return data;
}

/** A pack as its card shows it. */
export type PackCard = AssetPack & {
  /** Up to four of its assets, for the collage. */
  previews: Pick<
    Asset,
    "id" | "kind" | "sheetUrl" | "width" | "height" | "frames" | "frameMs"
  >[];
  /** Its assets' size when they share one, like "64×64". */
  size: string | null;
  longestSide: number;
  animated: number;
  /** Tag ids any of its assets has. */
  tags: string[];
  /** People who used any of its assets, summed per asset. */
  uses: number;
};

type PackCardRow = AssetPackRow & {
  members: (Pick<
    AssetRow,
    | "id"
    | "kind"
    | "width"
    | "height"
    | "frame_count"
    | "frame_ms"
    | "sheet_path"
    | "sort"
    | "name"
  > & { uses: number; asset_tag_links: { tag_id: string }[] })[];
};

/** Every pack with what its card shows. Throws when they can't load. */
export async function listPackCards(): Promise<PackCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asset_packs")
    .select(
      `${ASSET_PACK_COLUMNS}, members:assets(id, name, kind, width, height, frame_count, frame_ms, sheet_path, sort, uses, asset_tag_links(tag_id))`,
    )
    .order("sort")
    .order("name")
    .returns<PackCardRow[]>();
  if (error) throw new Error(`Couldn’t load asset packs: ${error.message}`);
  return data
    .filter((row) => row.members.length > 0)
    .map((row) => {
      const members = [...row.members].sort(
        (a, b) => a.sort - b.sort || a.name.localeCompare(b.name),
      );
      const sizes = new Set(members.map((m) => `${m.width}×${m.height}`));
      return {
        ...toAssetPack(row),
        previews: members.slice(0, 4).map((m) => ({
          id: m.id,
          kind: m.kind,
          sheetUrl: assetFileUrl(m.sheet_path),
          width: m.width,
          height: m.height,
          frames: m.frame_count,
          frameMs: m.frame_ms,
        })),
        size: sizes.size === 1 ? [...sizes][0]! : null,
        longestSide: Math.max(
          ...members.map((m) => Math.max(m.width, m.height)),
        ),
        animated: members.filter((m) => m.frame_count > 1).length,
        tags: [
          ...new Set(
            members.flatMap((m) => m.asset_tag_links.map((l) => l.tag_id)),
          ),
        ],
        uses: members.reduce((sum, m) => sum + m.uses, 0),
      };
    });
}

export const ASSET_PAGE_SIZE = 48;

/**
 * One page of the All assets grid. Filters that live in other tables (tags,
 * favourites, premium packs, search by pack or tag) narrow the asset ids or
 * packs first; the rest filter the assets query itself.
 */
export async function listAssetPage(
  userId: string,
  filters: AssetFilters,
  from: number,
): Promise<{ assets: Asset[]; count: number }> {
  const supabase = await createClient();
  let ids: Set<string> | null = null;
  const narrow = (list: string[]) => {
    ids = ids ? new Set(list.filter((id) => ids!.has(id))) : new Set(list);
  };

  if (filters.favourites) {
    const { data } = await supabase
      .from("asset_favourites")
      .select("asset_id")
      .eq("user_id", userId)
      .returns<{ asset_id: string }[]>();
    narrow((data ?? []).map((row) => row.asset_id));
  }
  for (const tag of filters.tags) {
    const { data } = await supabase
      .from("asset_tag_links")
      .select("asset_id")
      .eq("tag_id", tag)
      .returns<{ asset_id: string }[]>();
    narrow((data ?? []).map((row) => row.asset_id));
  }
  if ((ids as Set<string> | null)?.size === 0) return { assets: [], count: 0 };

  let premiumPacks: string[] | null = null;
  if (filters.access !== "any") {
    const { data } = await supabase
      .from("asset_packs")
      .select("id")
      .eq("premium", filters.access === "premium")
      .returns<{ id: string }[]>();
    premiumPacks = (data ?? []).map((row) => row.id);
    if (!premiumPacks.length) return { assets: [], count: 0 };
  }

  const term = cleanSearch(filters.query);
  let matches: string | null = null;
  if (term) {
    const [packs, tags] = await Promise.all([
      supabase
        .from("asset_packs")
        .select("id")
        .ilike("name", `%${term}%`)
        .returns<{ id: string }[]>(),
      supabase
        .from("asset_tags")
        .select("id, asset_tag_links(asset_id)")
        .ilike("name", `%${term}%`)
        .returns<{ id: string; asset_tag_links: { asset_id: string }[] }[]>(),
    ]);
    const packIds = (packs.data ?? []).map((row) => row.id);
    const tagged = (tags.data ?? []).flatMap((row) =>
      row.asset_tag_links.map((link) => link.asset_id),
    );
    matches = [
      `name.ilike.*${term}*`,
      `id.ilike.*${term}*`,
      ...(packIds.length ? [`pack_id.in.(${packIds.join(",")})`] : []),
      ...(tagged.length ? [`id.in.(${[...new Set(tagged)].join(",")})`] : []),
    ].join(",");
  }

  let query = supabase.from("assets").select(ASSET_COLUMNS, { count: "exact" });
  if (filters.pack) query = query.eq("pack_id", filters.pack);
  if (premiumPacks) query = query.in("pack_id", premiumPacks);
  const narrowed = ids as Set<string> | null;
  if (narrowed) query = query.in("id", [...narrowed]);
  const range = sizeRange(filters.size);
  if (range.max) query = query.lte("width", range.max).lte("height", range.max);
  if (filters.motion === "animated") query = query.gt("frame_count", 1);
  if (filters.motion === "still") query = query.eq("frame_count", 1);
  if (filters.kind !== "any") query = query.eq("kind", filters.kind);
  // Both of these are "any of" groups; send them as one filter, so they
  // can't be combined the wrong way.
  const bigEnough = range.min
    ? `width.gte.${range.min},height.gte.${range.min}`
    : null;
  if (bigEnough && matches)
    query = query.or(`and(or(${bigEnough}),or(${matches}))`);
  else if (bigEnough ?? matches) query = query.or((bigEnough ?? matches)!);
  query =
    filters.sort === "popular"
      ? query.order("uses", { ascending: false }).order("name")
      : filters.sort === "az" || filters.sort === "za"
        ? query.order("name", { ascending: filters.sort === "az" })
        : query.order("created_at", { ascending: false }).order("sort");
  const { data, count, error } = await query
    .order("id")
    .range(from, from + ASSET_PAGE_SIZE - 1)
    .returns<AssetRow[]>();
  if (error) throw new Error(`Couldn’t load assets: ${error.message}`);
  return { assets: await toAssets(supabase, data), count: count ?? 0 };
}

/** What this person used last, newest first, one entry per asset. */
export async function listRecentAssets(
  userId: string,
  limit = 12,
): Promise<Asset[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asset_uses")
    .select("asset_id")
    .eq("user_id", userId)
    .order("used_at", { ascending: false })
    .limit(limit * 3)
    .returns<{ asset_id: string }[]>();
  if (error || !data.length) return [];
  const order = [...new Set(data.map((row) => row.asset_id))].slice(0, limit);
  const { data: rows } = await supabase
    .from("assets")
    .select(ASSET_COLUMNS)
    .in("id", order)
    .returns<AssetRow[]>();
  const assets = await toAssets(supabase, rows ?? []);
  return order.flatMap((id) => assets.filter((asset) => asset.id === id));
}

/** The assets and packs this person marked as favourites. */
export async function listAssetFavourites(
  userId: string,
): Promise<{ assets: string[]; packs: string[] }> {
  const supabase = await createClient();
  const [assets, packs] = await Promise.all([
    supabase
      .from("asset_favourites")
      .select("asset_id")
      .eq("user_id", userId)
      .returns<{ asset_id: string }[]>(),
    supabase
      .from("asset_pack_favourites")
      .select("pack_id")
      .eq("user_id", userId)
      .returns<{ pack_id: string }[]>(),
  ]);
  return {
    assets: (assets.data ?? []).map((row) => row.asset_id),
    packs: (packs.data ?? []).map((row) => row.pack_id),
  };
}
