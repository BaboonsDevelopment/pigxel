"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import {
  countedCloudTilesOnServer,
  listCloudTilesOnServer,
  listRecentlyOpenedOnServer,
} from "@/lib/pigxel-file/cloud-server";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { removeAllVersions } from "@/features/versions/server";
import { requestReview } from "@/features/moderation/request";
import { listSavedArts, type SavedArt } from "@/features/explore/server";
import { cloudFilter, searchMatch, type ProjectQuery } from "./search";
import { PAGE_SIZE, PROJECT_NAME_MAX, RECENT_SHOWN } from "./constants";
import { FOLDER_NAME_MAX } from "./folders";
import { LABEL_COLORS, LABEL_NAME_MAX, type Label } from "./labels";
import { listLabels } from "./server";
import type { ArtStats } from "./stats";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Result = { error?: string };

export async function loadCloudTiles(
  from: number,
  folderId: string | null = null,
  options: ProjectQuery = {},
): Promise<CloudTileSummary[]> {
  const user = await requireUser();
  if (!Number.isInteger(from) || from < 0) return [];
  if (folderId !== null && !UUID.test(folderId)) return [];
  return listCloudTilesOnServer(
    user.id,
    PAGE_SIZE,
    from,
    folderId,
    cloudFilter(options),
  );
}

export async function loadCloudTilesCounted(
  folderId: string | null,
  options: ProjectQuery,
): Promise<{ tiles: CloudTileSummary[]; count: number }> {
  const user = await requireUser();
  if (folderId !== null && !UUID.test(folderId)) return { tiles: [], count: 0 };
  return countedCloudTilesOnServer(
    user.id,
    PAGE_SIZE,
    folderId,
    cloudFilter(options),
  );
}

export async function searchSavedArts(
  query: string,
  from = 0,
): Promise<{ arts: SavedArt[]; count: number | null }> {
  const user = await requireUser();
  if (!Number.isInteger(from) || from < 0) return { arts: [], count: 0 };
  try {
    return await listSavedArts(user.id, {
      match: searchMatch(query),
      from,
      limit: PAGE_SIZE,
    });
  } catch {
    return { arts: [], count: from === 0 ? 0 : null };
  }
}

function folderName(name: string) {
  const trimmed = name.trim();
  return trimmed && trimmed.length <= FOLDER_NAME_MAX ? trimmed : null;
}

export async function createFolder(
  name: string,
): Promise<{ id?: string; error?: string }> {
  await requireUser();
  const clean = folderName(name);
  if (!clean)
    return {
      error: `Give the folder a name up to ${FOLDER_NAME_MAX} characters.`,
    };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("folders")
      .insert({ name: clean })
      .select("id")
      .single();
    if (error) return { error: "Couldn’t create the folder. Try again." };
    refresh();
    return { id: data.id };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
}

export async function renameFolder(
  folderId: string,
  name: string,
): Promise<Result> {
  const user = await requireUser();
  const clean = folderName(name);
  if (!UUID.test(folderId)) return { error: "Invalid request." };
  if (!clean)
    return {
      error: `Give the folder a name up to ${FOLDER_NAME_MAX} characters.`,
    };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("folders")
      .update({ name: clean })
      .eq("id", folderId)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t rename the folder. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  refresh();
  return {};
}

export async function reorderFolders(folderIds: string[]): Promise<Result> {
  const user = await requireUser();
  if (!folderIds.length || !folderIds.every((id) => UUID.test(id)))
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const results = await Promise.all(
      folderIds.map((id, position) =>
        supabase
          .from("folders")
          .update({ position })
          .eq("id", id)
          .eq("user_id", user.id),
      ),
    );
    if (results.some((result) => result.error))
      return { error: "Couldn’t reorder folders. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  refresh();
  return {};
}

export async function deleteFolder(folderId: string): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(folderId)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", folderId)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t delete the folder. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  refresh();
  return {};
}

export async function moveTileToFolder(
  tileId: string,
  folderId: string | null,
): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(tileId) || (folderId !== null && !UUID.test(folderId)))
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("tiles")
      .update({ folder_id: folderId })
      .eq("id", tileId)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t move this project. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  refresh();
  return {};
}

export async function createLabel(
  name: string,
  color: string,
): Promise<{ label?: Label; error?: string }> {
  await requireUser();
  const clean = name.trim();
  if (!clean || clean.length > LABEL_NAME_MAX)
    return {
      error: `Give the label a name up to ${LABEL_NAME_MAX} characters.`,
    };
  if (!(LABEL_COLORS as readonly string[]).includes(color))
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("labels")
      .insert({ name: clean, color })
      .select("id, name, color")
      .single();
    if (error?.code === "23505")
      return { error: "You already have a label with that name." };
    if (error) return { error: "Couldn’t create the label. Try again." };
    return { label: data };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
}

export async function deleteLabel(labelId: string): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(labelId)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("labels")
      .delete()
      .eq("id", labelId)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t delete the label. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

export async function setTileLabels(
  tileId: string,
  labelIds: string[],
): Promise<Result> {
  await requireUser();
  if (!UUID.test(tileId) || !labelIds.every((id) => UUID.test(id)))
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const cleared = supabase.from("tile_labels").delete().eq("tile_id", tileId);
    const { error } = await (labelIds.length
      ? cleared.not("label_id", "in", `(${labelIds.join(",")})`)
      : cleared);
    if (error) return { error: "Couldn’t change labels. Try again." };
    if (labelIds.length) {
      const { error: added } = await supabase.from("tile_labels").upsert(
        labelIds.map((label_id) => ({ tile_id: tileId, label_id })),
        { onConflict: "tile_id,label_id", ignoreDuplicates: true },
      );
      if (added) return { error: "Couldn’t change labels. Try again." };
    }
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

export async function setProjectPinned(
  tileId: string,
  pinned: boolean,
): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(tileId)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("tiles")
      .update({ pinned_at: pinned ? new Date().toISOString() : null })
      .eq("id", tileId)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t change that. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

export async function markTileOpened(tileId: string): Promise<void> {
  const user = await requireUser();
  if (!UUID.test(tileId)) return;
  try {
    const supabase = await createClient();
    await supabase
      .from("tiles")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", tileId)
      .eq("user_id", user.id);
  } catch {}
}

export async function setProjectArchived(
  tileId: string,
  archived: boolean,
): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(tileId)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("tiles")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", tileId)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t change that. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

export async function renameTile(
  tileId: string,
  name: string,
): Promise<Result> {
  const user = await requireUser();
  const clean = name.trim();
  if (!UUID.test(tileId)) return { error: "Invalid request." };
  if (!clean || clean.length > PROJECT_NAME_MAX)
    return {
      error: `Give the project a name up to ${PROJECT_NAME_MAX} characters.`,
    };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("tiles")
      .update({ name: clean })
      .eq("id", tileId)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t rename the project. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

export async function loadRecentlyOpened(): Promise<CloudTileSummary[]> {
  const user = await requireUser();
  return listRecentlyOpenedOnServer(user.id, RECENT_SHOWN);
}

export async function loadLabels(): Promise<Label[]> {
  const user = await requireUser();
  try {
    return await listLabels(user.id);
  } catch {
    return [];
  }
}

export async function publishProjects(tileIds: string[]): Promise<Result> {
  const user = await requireUser();
  if (!tileIds.length || !tileIds.every((id) => UUID.test(id)))
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    await Promise.all(
      tileIds.map((id) => requestReview(supabase, id, user.id)),
    );
  } catch {
    return { error: "Couldn’t publish these projects. Try again." };
  }
  return {};
}

const validIds = (ids: string[]) =>
  ids.length > 0 && ids.length <= 200 && ids.every((id) => UUID.test(id));

export async function trashProjects(tileIds: string[]): Promise<Result> {
  const user = await requireUser();
  if (!validIds(tileIds)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("tiles")
      .update({
        deleted_at: new Date().toISOString(),
        visibility: "private",
        review: null,
      })
      .in("id", tileIds)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t move that to Trash. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

export async function restoreProjects(tileIds: string[]): Promise<Result> {
  const user = await requireUser();
  if (!validIds(tileIds)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("tiles")
      .update({ deleted_at: null })
      .in("id", tileIds)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t restore that. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

export async function deleteProjectsForever(
  tileIds: string[] | "all",
): Promise<Result> {
  const user = await requireUser();
  if (tileIds !== "all" && !validIds(tileIds))
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const query = supabase
      .from("tiles")
      .select("id")
      .eq("user_id", user.id)
      .not("deleted_at", "is", null);
    const { data, error } = await (tileIds === "all"
      ? query
      : query.in("id", tileIds));
    if (error) return { error: "Couldn’t empty Trash. Try again." };
    if (!data.length) return {};
    const ids = data.map((row) => row.id as string);
    if (isSupabaseAdminConfigured())
      await removeAllVersions(createAdminClient(), ids).catch(() => {});
    await supabase.storage
      .from("tiles")
      .remove(ids.map((id) => `${user.id}/${id}.pigxel`));
    const removed = await supabase.from("tiles").delete().in("id", ids);
    if (removed.error) return { error: "Couldn’t empty Trash. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

type StatsRow = {
  id: string;
  name: string;
  thumbnail: string | null;
  likes: { count: number }[];
  comments: { count: number }[];
  views: { total: number } | null;
  downloads: { total: number } | null;
};

const STATS_COLUMNS =
  "id, name, thumbnail, likes:tile_likes(count), comments:tile_comments(count), views:tile_views(total), downloads:tile_downloads(total)";

const toArtStats = (row: StatsRow): ArtStats => ({
  id: row.id,
  name: row.name,
  thumbnail: row.thumbnail,
  views: Number(row.views?.total ?? 0),
  likes: row.likes[0]?.count ?? 0,
  downloads: Number(row.downloads?.total ?? 0),
  comments: row.comments[0]?.count ?? 0,
});

export async function loadProfileStats(profileId: string): Promise<ArtStats[]> {
  if (!UUID.test(profileId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tiles")
    .select(STATS_COLUMNS)
    .eq("user_id", profileId)
    .eq("visibility", "public")
    .is("deleted_at", null);
  if (error) throw new Error("Couldn’t load statistics. Try again.");
  return (data as unknown as StatsRow[]).map(toArtStats);
}

export async function loadArtStats(tileId?: string): Promise<ArtStats[]> {
  const user = await requireUser();
  if (tileId !== undefined && !UUID.test(tileId)) return [];
  const supabase = await createClient();
  const base = supabase
    .from("tiles")
    .select(STATS_COLUMNS)
    .eq("user_id", user.id)
    .or("visibility.eq.public,review.eq.pending")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const { data, error } = await (tileId ? base.eq("id", tileId) : base);
  if (error) throw new Error("Couldn’t load statistics. Try again.");
  return (data as unknown as StatsRow[]).map(toArtStats);
}
