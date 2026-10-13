"use server";

import { refresh } from "next/cache";
import { isAdmin, requireUser } from "@/lib/auth/session";
import { ASSET_BUCKET, PREMIUM_ASSET_BUCKET, type AssetRow } from "./assets";
import { createClient } from "@/lib/supabase/server";

export async function removeAsset(id: string): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Only admins can remove assets." };
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("assets")
      .delete()
      .eq("id", id)
      .select("file_path, sheet_path, premium")
      .returns<Pick<AssetRow, "file_path" | "sheet_path" | "premium">[]>();
    const removed = data?.[0];
    if (!removed) return { error: "Couldn’t remove this asset. Try again." };
    await Promise.all([
      supabase.storage.from(ASSET_BUCKET).remove([removed.sheet_path]),
      supabase.storage
        .from(removed.premium ? PREMIUM_ASSET_BUCKET : ASSET_BUCKET)
        .remove([removed.file_path]),
    ]);
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  refresh();
  return {};
}
