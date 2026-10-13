"use server";

import { requireUser } from "@/lib/auth/session";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { restoreVersionFile, storeVersion } from "./server";
import { VERSION_EVERY_MS, type TileVersion } from "./versions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function canEdit(userId: string, tileId: string) {
  const supabase = await createClient();
  const [tile, member] = await Promise.all([
    supabase
      .from("tiles")
      .select("user_id")
      .eq("id", tileId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("tile_members")
      .select("role")
      .eq("tile_id", tileId)
      .eq("user_id", userId)
      .not("accepted_at", "is", null)
      .maybeSingle(),
  ]);
  if (!tile.data) return false;
  return tile.data.user_id === userId || member.data?.role === "editor";
}

export async function snapshotVersion(tileId: string): Promise<boolean> {
  const user = await requireUser();
  if (!UUID.test(tileId) || !isSupabaseAdminConfigured()) return false;
  try {
    if (!(await canEdit(user.id, tileId))) return false;
    const admin = createAdminClient();
    const { data: last } = await admin
      .from("tile_versions")
      .select("created_at")
      .eq("tile_id", tileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last && Date.now() - Date.parse(last.created_at) < VERSION_EVERY_MS)
      return true;
    await storeVersion(admin, tileId, user.id);
    return true;
  } catch (error) {
    console.error("Couldn’t keep a tile version:", error);
    return false;
  }
}

type VersionRow = {
  id: string;
  created_at: string;
  width: number;
  height: number;
  thumbnail: string | null;
  author: { display_name: string } | null;
};

export async function loadVersions(tileId: string): Promise<TileVersion[]> {
  await requireUser();
  if (!UUID.test(tileId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tile_versions")
    .select(
      "id, created_at, width, height, thumbnail, author:profiles(display_name)",
    )
    .eq("tile_id", tileId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("Couldn’t load version history. Try again.");
  return (data as unknown as VersionRow[]).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    author: row.author?.display_name ?? null,
    width: row.width,
    height: row.height,
    thumbnail: row.thumbnail,
  }));
}

export async function restoreVersion(
  tileId: string,
  versionId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!UUID.test(tileId) || !UUID.test(versionId))
    return { error: "Invalid request." };
  if (!isSupabaseAdminConfigured())
    return { error: "Version history isn’t set up on this server." };
  try {
    if (!(await canEdit(user.id, tileId)))
      return { error: "You can’t change this tile." };
    const admin = createAdminClient();
    await storeVersion(admin, tileId, user.id);
    await restoreVersionFile(admin, tileId, versionId);
  } catch (error) {
    console.error("Couldn’t restore a tile version:", error);
    return { error: "Couldn’t restore this version. Try again." };
  }
  return {};
}
