import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "assets";
export const PREMIUM_BUCKET = "premium-assets";

export async function removeAsset(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("assets")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`${id}: couldn’t remove: ${error.message}`);
  if (!data?.length) return false;
  await Promise.all(
    [BUCKET, PREMIUM_BUCKET].map(async (bucket) => {
      const storage = supabase.storage.from(bucket);
      const { data: files } = await storage.list(id);
      const paths = (files ?? []).map((f) => `${id}/${f.name}`);
      if (paths.length) await storage.remove(paths);
    }),
  );
  return true;
}
