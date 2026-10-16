"use server";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { findTutorial } from "./tutorials";

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
