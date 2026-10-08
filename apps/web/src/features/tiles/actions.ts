"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";
import { createClient } from "@/lib/supabase/server";
import { SIZES } from "@/features/explore/constants";
import { PAGE_SIZE } from "./constants";
import { FOLDER_NAME_MAX } from "./folders";
import { LABEL_COLORS, LABEL_NAME_MAX, type Label } from "./labels";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Result = { error?: string };

export async function loadCloudTiles(
  from: number,
  folderId: string | null = null,
  size = "any",
  animated = false,
  label: string | null = null,
): Promise<CloudTileSummary[]> {
  const user = await requireUser();
  if (!Number.isInteger(from) || from < 0) return [];
  if (folderId !== null && !UUID.test(folderId)) return [];
  if (label !== null && !UUID.test(label)) return [];
  const range = SIZES.find((s) => s.value === size) ?? SIZES[0];
  return listCloudTilesOnServer(user.id, PAGE_SIZE, from, folderId, {
    min: range.min,
    max: range.max,
    animated: animated === true,
    label,
  });
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
