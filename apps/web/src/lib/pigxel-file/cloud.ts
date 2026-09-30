import { createClient } from "@/lib/supabase/client";
import {
  PIGXEL_MIME_TYPE,
  stripPigxelExtension,
  type PigxelDocument,
} from "./format";
import type { CloudTile } from "./location";

/**
 * Tiles in Pigxel cloud: a row in the `tiles` table (name, size, thumbnail)
 * and the .pigxel file in the private `tiles` Storage bucket, at
 * `<user id>/<tile id>.pigxel`. Row-level security keeps each person to their
 * own tiles, so this runs with the signed-in browser session.
 */

const BUCKET = "tiles";

export type CloudTileSummary = CloudTile & {
  width: number;
  height: number;
  thumbnail: string | null;
  updatedAt: string;
};

export class CloudError extends Error {}

type TileRow = {
  id: string;
  user_id: string;
  name: string;
  width: number;
  height: number;
  thumbnail: string | null;
  updated_at: string;
};

const filePath = (row: { id: string; user_id: string }) =>
  `${row.user_id}/${row.id}.pigxel`;

/** The person's cloud tiles, most recently changed first. */
export async function listCloudTiles(): Promise<CloudTileSummary[]> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new CloudError("Sign in again to see your tiles.");
  const { data, error } = await supabase
    .from("tiles")
    .select("id, user_id, name, width, height, thumbnail, updated_at")
    // Others' public tiles are readable too; this list is only your own.
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new CloudError("Couldn’t load your Pigxel cloud tiles.");
  return (data as TileRow[]).map(toSummary);
}

export function toSummary(row: TileRow): CloudTileSummary {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    thumbnail: row.thumbnail,
    updatedAt: row.updated_at,
  };
}

export async function readCloudTile(id: string): Promise<string> {
  const supabase = createClient();
  const row = await findRow(supabase, id);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(filePath(row));
  if (error || !data)
    throw new CloudError("Couldn’t open this tile from Pigxel cloud.");
  return data.text();
}

/**
 * Creates a cloud tile, or updates `tile.id` when given, and returns it.
 * `image` fills in the size, background and thumbnail for the tile list.
 */
export async function saveCloudTile(
  tile: { id?: string; name: string },
  contents: string,
  image: PigxelDocument,
  thumbnail: string,
): Promise<CloudTile> {
  const supabase = createClient();
  const details = {
    name: stripPigxelExtension(tile.name).trim().slice(0, 100) || "Untitled",
    width: image.width,
    height: image.height,
    background: image.background,
    thumbnail: thumbnail.length <= 50000 ? thumbnail : null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = tile.id
    ? await supabase
        .from("tiles")
        .update(details)
        .eq("id", tile.id)
        .select("id, user_id, name")
        .maybeSingle()
    : await supabase
        .from("tiles")
        .insert(details)
        .select("id, user_id, name")
        .single();
  if (error) throw new CloudError("Couldn’t save to Pigxel cloud. Try again.");
  if (!data)
    throw new CloudError(
      "This tile is no longer in Pigxel cloud. Save it again to keep it.",
    );

  const upload = await supabase.storage
    .from(BUCKET)
    .upload(filePath(data), new Blob([contents], { type: PIGXEL_MIME_TYPE }), {
      contentType: PIGXEL_MIME_TYPE,
      upsert: true,
    });
  if (upload.error) {
    // A new tile without its file would be empty: take the row back out.
    if (!tile.id) await supabase.from("tiles").delete().eq("id", data.id);
    throw new CloudError("Couldn’t save to Pigxel cloud. Try again.");
  }
  return { id: data.id, name: data.name };
}

export async function deleteCloudTile(id: string): Promise<void> {
  const supabase = createClient();
  const row = await findRow(supabase, id);
  await supabase.storage.from(BUCKET).remove([filePath(row)]);
  const { error } = await supabase.from("tiles").delete().eq("id", id);
  if (error) throw new CloudError("Couldn’t delete this tile. Try again.");
}

async function findRow(supabase: ReturnType<typeof createClient>, id: string) {
  const { data, error } = await supabase
    .from("tiles")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new CloudError("Couldn’t reach Pigxel cloud. Try again.");
  if (!data) throw new CloudError("This tile is no longer in Pigxel cloud.");
  return data;
}
