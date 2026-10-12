import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Buckets that keep each person's files under a folder named by their ID. */
export const USER_BUCKETS = ["tiles", "tile-versions", "avatars"] as const;

const PAGE = 1000;

/** Every file path under `prefix` in a bucket, through nested folders. */
export async function listFiles(
  admin: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset });
    if (error)
      throw new Error(`Couldn’t list ${bucket}/${prefix}: ${error.message}`);
    for (const item of data) {
      const path = `${prefix}/${item.name}`;
      // Folders have no id.
      if (item.id) paths.push(path);
      else paths.push(...(await listFiles(admin, bucket, path)));
    }
    if (data.length < PAGE) return paths;
  }
}
