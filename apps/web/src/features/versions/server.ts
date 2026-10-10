import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { VERSIONS_BUCKET, VERSIONS_KEPT } from "./versions";

const PIGXEL_MIME_TYPE = "application/vnd.pigxel+json";

type Admin = ReturnType<typeof createAdminClient>;

const versionPath = (tileId: string, versionId: string) =>
  `${tileId}/${versionId}.pigxel`;

export async function storeVersion(
  admin: Admin,
  tileId: string,
  authorId: string,
) {
  const { data: tile, error } = await admin
    .from("tiles")
    .select("user_id, width, height, frame_count, thumbnail")
    .eq("id", tileId)
    .single();
  if (error || !tile) throw new Error("Tile not found.");
  const file = await admin.storage
    .from("tiles")
    .download(`${tile.user_id}/${tileId}.pigxel`);
  if (file.error || !file.data) throw new Error("Tile file not found.");
  const id = crypto.randomUUID();
  const upload = await admin.storage
    .from(VERSIONS_BUCKET)
    .upload(versionPath(tileId, id), file.data, {
      contentType: PIGXEL_MIME_TYPE,
    });
  if (upload.error) throw new Error(upload.error.message);
  const inserted = await admin.from("tile_versions").insert({
    id,
    tile_id: tileId,
    author_id: authorId,
    width: tile.width,
    height: tile.height,
    frame_count: tile.frame_count,
    thumbnail: tile.thumbnail,
  });
  if (inserted.error) {
    await admin.storage.from(VERSIONS_BUCKET).remove([versionPath(tileId, id)]);
    throw new Error(inserted.error.message);
  }
  const { data: old } = await admin
    .from("tile_versions")
    .select("id")
    .eq("tile_id", tileId)
    .order("created_at", { ascending: false })
    .range(VERSIONS_KEPT, VERSIONS_KEPT + 100);
  if (old?.length)
    await removeVersions(
      admin,
      tileId,
      old.map((v) => v.id),
    );
}

export async function removeVersions(
  admin: Admin,
  tileId: string,
  ids: string[],
) {
  await admin.storage
    .from(VERSIONS_BUCKET)
    .remove(ids.map((id) => versionPath(tileId, id)));
  await admin.from("tile_versions").delete().in("id", ids);
}

export async function removeAllVersions(admin: Admin, tileIds: string[]) {
  if (!tileIds.length) return;
  const { data } = await admin
    .from("tile_versions")
    .select("id, tile_id")
    .in("tile_id", tileIds);
  if (!data?.length) return;
  await admin.storage
    .from(VERSIONS_BUCKET)
    .remove(data.map((v) => versionPath(v.tile_id, v.id)));
}

export async function restoreVersionFile(
  admin: Admin,
  tileId: string,
  versionId: string,
) {
  const [{ data: tile }, { data: version }] = await Promise.all([
    admin.from("tiles").select("user_id").eq("id", tileId).single(),
    admin
      .from("tile_versions")
      .select("width, height, frame_count, thumbnail")
      .eq("id", versionId)
      .eq("tile_id", tileId)
      .single(),
  ]);
  if (!tile || !version) throw new Error("Version not found.");
  const file = await admin.storage
    .from(VERSIONS_BUCKET)
    .download(versionPath(tileId, versionId));
  if (file.error || !file.data) throw new Error("Version file not found.");
  const upload = await admin.storage
    .from("tiles")
    .upload(`${tile.user_id}/${tileId}.pigxel`, file.data, {
      contentType: PIGXEL_MIME_TYPE,
      upsert: true,
    });
  if (upload.error) throw new Error(upload.error.message);
  const { error } = await admin
    .from("tiles")
    .update({
      width: version.width,
      height: version.height,
      frame_count: version.frame_count,
      thumbnail: version.thumbnail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tileId);
  if (error) throw new Error(error.message);
}
