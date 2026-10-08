import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { toSummary, type CloudTileSummary } from "./cloud";

const COLUMNS =
  "id, user_id, name, width, height, thumbnail, updated_at, visibility, review, labels:tile_labels(label_id)";

type CloudTileFilter = {
  min?: number;
  max?: number;
  animated?: boolean;
  label?: string | null;
};

export async function listCloudTilesOnServer(
  userId: string,
  limit = 200,
  from = 0,
  folderId: string | null = null,
  filter: CloudTileFilter = {},
): Promise<CloudTileSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  let query = supabase
    .from("tiles")
    .select(
      filter.label
        ? `${COLUMNS}, labelled:tile_labels!inner(label_id)`
        : COLUMNS,
    )
    .eq("user_id", userId);
  if (folderId) query = query.eq("folder_id", folderId);
  if (filter.max)
    query = query.lte("width", filter.max).lte("height", filter.max);
  if (filter.min)
    query = query.or(`width.gte.${filter.min},height.gte.${filter.min}`);
  if (filter.animated) query = query.gt("frame_count", 1);
  if (filter.label) query = query.eq("labelled.label_id", filter.label);
  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .order("id")
    .range(from, from + limit - 1);
  if (error || !data) return [];
  return (data as unknown as Parameters<typeof toSummary>[0][]).map(toSummary);
}
