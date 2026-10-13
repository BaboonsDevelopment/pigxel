import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { toSummary, type CloudTileSummary } from "./cloud";

const COLUMNS =
  "id, user_id, name, width, height, thumbnail, updated_at, visibility, review, pinned_at, opened_at, deleted_at, labels:tile_labels(label_id)";

type CloudTileFilter = {
  min?: number;
  max?: number;
  animated?: boolean;
  label?: string | null;
  match?: string | null;
  published?: boolean;
  pinnedFirst?: boolean;
  order?: "edited" | "oldest" | "az" | "za";
  archived?: boolean;
  trashed?: boolean;
};

export async function listCloudTilesOnServer(
  userId: string,
  limit = 200,
  from = 0,
  folderId: string | null = null,
  filter: CloudTileFilter = {},
): Promise<CloudTileSummary[]> {
  const { tiles } = await cloudTilesPage(userId, limit, from, folderId, filter);
  return tiles;
}

export function countedCloudTilesOnServer(
  userId: string,
  limit: number,
  folderId: string | null,
  filter: CloudTileFilter,
) {
  return cloudTilesPage(userId, limit, 0, folderId, filter, true);
}

async function cloudTilesPage(
  userId: string,
  limit: number,
  from: number,
  folderId: string | null,
  filter: CloudTileFilter,
  counted = false,
): Promise<{ tiles: CloudTileSummary[]; count: number }> {
  if (!isSupabaseConfigured()) return { tiles: [], count: 0 };
  const supabase = await createClient();
  let query = supabase
    .from("tiles")
    .select(
      filter.label
        ? `${COLUMNS}, labelled:tile_labels!inner(label_id)`
        : COLUMNS,
      counted ? { count: "exact" } : undefined,
    )
    .eq("user_id", userId);
  if (folderId) query = query.eq("folder_id", folderId);
  if (filter.max)
    query = query.lte("width", filter.max).lte("height", filter.max);
  if (filter.min)
    query = query.or(`width.gte.${filter.min},height.gte.${filter.min}`);
  if (filter.animated) query = query.gt("frame_count", 1);
  if (filter.label) query = query.eq("labelled.label_id", filter.label);
  if (filter.match) query = query.or(filter.match);
  if (filter.published === true)
    query = query.or("visibility.eq.public,review.eq.pending");
  if (filter.published === false)
    query = query
      .neq("visibility", "public")
      .or("review.is.null,review.neq.pending");
  if (filter.trashed)
    query = query
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
  else
    query = (
      filter.archived
        ? query.not("archived_at", "is", null)
        : query.is("archived_at", null)
    ).is("deleted_at", null);
  if (filter.pinnedFirst && !filter.trashed)
    query = query.order("pinned_at", { ascending: false, nullsFirst: false });
  const order = filter.order ?? "edited";
  if (order === "az" || order === "za")
    query = query.order("name", { ascending: order === "az" });
  const { data, error, count } = await query
    .order("updated_at", { ascending: order === "oldest" })
    .order("id")
    .range(from, from + limit - 1);
  if (error || !data) return { tiles: [], count: 0 };
  const tiles = (data as unknown as Parameters<typeof toSummary>[0][]).map(
    toSummary,
  );
  return { tiles, count: count ?? tiles.length };
}

export async function listRecentlyOpenedOnServer(
  userId: string,
  limit: number,
): Promise<CloudTileSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tiles")
    .select(COLUMNS)
    .eq("user_id", userId)
    .not("opened_at", "is", null)
    .is("archived_at", null)
    .is("deleted_at", null)
    .order("opened_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as Parameters<typeof toSummary>[0][]).map(toSummary);
}
