import "server-only";
import { createClient } from "@/lib/supabase/server";
import { youtubeIdFrom } from "./video";

/** Missing recordings stay missing; existing guides still work if this query fails. */
export async function listTutorialVideos(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tutorial_videos")
    .select("slug, youtube_id")
    .returns<{ slug: string; youtube_id: string }[]>();
  if (error) {
    console.error("Couldn’t load lesson videos:", error.message);
    return new Map();
  }
  return new Map(
    data
      .filter((row) => youtubeIdFrom(row.youtube_id))
      .map((row) => [row.slug, row.youtube_id]),
  );
}

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
