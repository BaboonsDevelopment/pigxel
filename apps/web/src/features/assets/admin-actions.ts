"use server";

import { refresh } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ASSET_BUCKET,
  assetIdFor,
  PREMIUM_ASSET_BUCKET,
  type AssetRow,
} from "./assets";
import { isAssetBackground } from "./constants";
import { isLocalAdmin } from "./local-admin";

type Result = { error?: string };

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME_MAX = 40;
const DESCRIPTION_MAX = 400;
const NOT_ADMIN = {
  error: "Assets can only be changed from the local admin page.",
};

/**
 * Every change here runs with the server key, and only on a developer's
 * machine (see isLocalAdmin); anywhere else it refuses.
 */
async function adminClient(): Promise<SupabaseClient | null> {
  await requireUser();
  return isLocalAdmin() ? createAdminClient() : null;
}

/** Renames a pack, or changes its description or background colour. */
export async function updatePack(
  id: string,
  details: { name: string; description: string; background: string | null },
): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return NOT_ADMIN;
  const name = details.name.trim();
  const description = details.description.trim();
  if (!ID.test(id)) return { error: "Invalid request." };
  if (!name || name.length > NAME_MAX)
    return { error: `Give it a name of up to ${NAME_MAX} characters.` };
  if (description.length > DESCRIPTION_MAX)
    return {
      error: `Keep the description under ${DESCRIPTION_MAX} characters.`,
    };
  if (details.background !== null && !isAssetBackground(details.background))
    return { error: "Pick one of the background colours." };
  const { data, error } = await supabase
    .from("asset_packs")
    .update({
      name,
      description: description || null,
      background: details.background,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error || !data.length) return { error: "Couldn’t save the pack." };
  refresh();
  return {};
}

/**
 * Makes a pack premium or free. Each asset's .pigxel file moves to the
 * private bucket (or back), and its row follows, one asset at a time; the
 * pack changes once all of them have. Safe to run again after a failure.
 */
export async function setPackPremium(
  id: string,
  premium: boolean,
): Promise<Result & { moved?: number }> {
  const supabase = await adminClient();
  if (!supabase) return NOT_ADMIN;
  if (!ID.test(id)) return { error: "Invalid request." };
  const { data: assets, error } = await supabase
    .from("assets")
    .select("id, file_path, premium")
    .eq("pack_id", id)
    .returns<{ id: string; file_path: string; premium: boolean }[]>();
  if (error) return { error: "Couldn’t read the pack’s assets." };

  const from = premium ? ASSET_BUCKET : PREMIUM_ASSET_BUCKET;
  const to = premium ? PREMIUM_ASSET_BUCKET : ASSET_BUCKET;
  let moved = 0;
  for (const asset of assets.filter((a) => a.premium !== premium)) {
    const move = await supabase.storage
      .from(from)
      .move(asset.file_path, asset.file_path, { destinationBucket: to });
    if (move.error && !(await existsIn(supabase, to, asset.file_path)))
      return {
        error: `Moved ${moved} files, then couldn’t move “${asset.id}”. Try again.`,
        moved,
      };
    const { error: rowError } = await supabase
      .from("assets")
      .update({ premium, updated_at: new Date().toISOString() })
      .eq("id", asset.id);
    if (rowError)
      return {
        error: `Moved ${moved} files, then couldn’t save “${asset.id}”. Try again.`,
        moved,
      };
    moved++;
  }

  const { error: packError } = await supabase
    .from("asset_packs")
    .update({ premium, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (packError)
    return { error: "Moved the files, but couldn’t save the pack.", moved };
  refresh();
  return { moved };
}

/** Whether a file is already where a move would put it (an earlier try). */
async function existsIn(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
) {
  const slash = path.lastIndexOf("/");
  const { data } = await supabase.storage
    .from(bucket)
    .list(path.slice(0, slash), { search: path.slice(slash + 1) });
  return !!data?.some((file) => file.name === path.slice(slash + 1));
}

/** Sets an asset's tags to exactly these. */
export async function setAssetTags(
  assetId: string,
  tagIds: string[],
): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return NOT_ADMIN;
  if (!ID.test(assetId) || !tagIds.every((tag) => ID.test(tag)))
    return { error: "Invalid request." };
  const wanted = [...new Set(tagIds)];
  const removed = await supabase
    .from("asset_tag_links")
    .delete()
    .eq("asset_id", assetId)
    .not("tag_id", "in", `(${wanted.join(",") || "_"})`);
  if (removed.error) return { error: "Couldn’t save the tags." };
  if (wanted.length) {
    const added = await supabase.from("asset_tag_links").upsert(
      wanted.map((tag) => ({ asset_id: assetId, tag_id: tag })),
      { ignoreDuplicates: true },
    );
    if (added.error) return { error: "Couldn’t save the tags." };
  }
  refresh();
  return {};
}

/** Adds a tag to the fixed list; its id comes from its name. */
export async function createAssetTag(
  name: string,
): Promise<Result & { tag?: { id: string; name: string } }> {
  const supabase = await adminClient();
  if (!supabase) return NOT_ADMIN;
  const clean = name.trim();
  const id = assetIdFor(clean);
  if (!id || clean.length > NAME_MAX)
    return { error: `Give the tag a name of up to ${NAME_MAX} characters.` };
  const { data: last } = await supabase
    .from("asset_tags")
    .select("sort")
    .order("sort", { ascending: false })
    .limit(1)
    .returns<{ sort: number }[]>();
  const { error } = await supabase
    .from("asset_tags")
    .upsert(
      { id, name: clean, sort: (last?.[0]?.sort ?? -1) + 1 },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) return { error: "Couldn’t add the tag." };
  return { tag: { id, name: clean } };
}

/** Puts an asset first in its pack, so it leads the pack's collage. */
export async function moveAssetToFront(assetId: string): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return NOT_ADMIN;
  if (!ID.test(assetId)) return { error: "Invalid request." };
  const { data: asset } = await supabase
    .from("assets")
    .select("pack_id")
    .eq("id", assetId)
    .maybeSingle<{ pack_id: string }>();
  if (!asset) return { error: "No such asset." };
  const { data: first } = await supabase
    .from("assets")
    .select("sort")
    .eq("pack_id", asset.pack_id)
    .order("sort")
    .limit(1)
    .returns<{ sort: number }[]>();
  const { error } = await supabase
    .from("assets")
    .update({ sort: (first?.[0]?.sort ?? 0) - 1 })
    .eq("id", assetId);
  if (error) return { error: "Couldn’t move it." };
  refresh();
  return {};
}

/** Removes an asset and its files from the Assets page. */
export async function removeAsset(id: string): Promise<Result> {
  const supabase = await adminClient();
  if (!supabase) return NOT_ADMIN;
  if (!ID.test(id)) return { error: "Invalid request." };
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
  refresh();
  return {};
}
