import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Slugs of the tutorials a person has finished; empty if unknown. */
export async function listFinishedTutorials(
  userId: string,
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tutorial_completions")
    .select("slug")
    .eq("user_id", userId);
  if (error) {
    console.error("Couldn’t load finished tutorials:", error.message);
    return new Set();
  }
  return new Set(data.map((row) => row.slug as string));
}
