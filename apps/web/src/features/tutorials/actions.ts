"use server";

import { isAdmin, requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findTutorial } from "./tutorials";
import { youtubeIdFrom } from "./video";
import type { PerkState } from "@/features/membership/validation";

export async function saveTutorialVideo(
  slug: string,
  _state: PerkState,
  form: FormData,
): Promise<PerkState> {
  const user = await requireUser();
  if (!isAdmin(user))
    return { error: "Only the Pigxel team can attach lesson videos." };
  if (!findTutorial(slug)) return { error: "Unknown lesson." };
  const raw = form.get("video");
  if (typeof raw !== "string" || raw.length > 500)
    return { error: "Enter a YouTube video link or ID." };
  const youtubeId = raw.trim() ? youtubeIdFrom(raw) : null;
  if (raw.trim() && !youtubeId)
    return { error: "Use a valid YouTube video link or ID." };
  const supabase = await createClient();
  const { error } = youtubeId
    ? await supabase
        .from("tutorial_videos")
        .upsert({ slug, youtube_id: youtubeId })
    : await supabase.from("tutorial_videos").delete().eq("slug", slug);
  if (error) return { error: "Couldn’t save the video. Try again." };
  revalidatePath("/tutorials");
  revalidatePath(`/tutorials/${slug}`);
  return {
    message: youtubeId ? "Lesson video saved." : "Lesson video removed.",
  };
}

/** Records that the signed-in person finished a tutorial's guide. */
export async function completeTutorial(slug: string): Promise<void> {
  await requireUser();
  if (!findTutorial(slug)) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("tutorial_completions")
    .upsert({ slug }, { onConflict: "user_id,slug", ignoreDuplicates: true });
  if (error) console.error("Couldn’t record the finished tutorial:", error);
}
