"use server";

import { refresh } from "next/cache";
import { isAdmin, requireUser } from "@/lib/auth/session";
import { ASSET_BUCKET, type AssetRow } from "@/lib/assets/assets";
import { createClient } from "@/lib/supabase/server";

/** Takes an asset off the Assets page, files and all. Admins only. */
export async function removeAsset(id: string): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Only admins can remove assets." };
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("assets")
      .delete()
      .eq("id", id)
      .select("file_path, sheet_path")
      .returns<Pick<AssetRow, "file_path" | "sheet_path">[]>();
    const removed = data?.[0];
    if (!removed) return { error: "Couldn’t remove this asset. Try again." };
    await supabase.storage
      .from(ASSET_BUCKET)
      .remove([removed.file_path, removed.sheet_path]);
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  refresh();
  return {};
}
