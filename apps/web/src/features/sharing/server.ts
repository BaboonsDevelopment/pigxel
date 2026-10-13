import "server-only";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function joinByLink(
  token: string,
): Promise<{ id: string; name: string } | null> {
  if (!UUID.test(token)) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("join_tile_by_link", {
      link: token,
    });
    if (error || typeof data !== "string") return null;
    const { data: tile } = await supabase
      .from("tiles")
      .select("id, name")
      .eq("id", data)
      .maybeSingle<{ id: string; name: string }>();
    return tile;
  } catch {
    return null;
  }
}
