"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "./constants";
import { FOLDER_NAME_MAX } from "./folders";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Result = { error?: string };

export async function loadCloudTiles(
  from: number,
  folderId: string | null = null,
): Promise<CloudTileSummary[]> {
  const user = await requireUser();
  if (!Number.isInteger(from) || from < 0) return [];
  if (folderId !== null && !UUID.test(folderId)) return [];
  return listCloudTilesOnServer(user.id, PAGE_SIZE, from, folderId);
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
