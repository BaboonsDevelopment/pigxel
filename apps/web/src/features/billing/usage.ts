import "server-only";
import { createClient } from "@/lib/supabase/server";
import { creditBalance } from "@/features/ai/credits";

export type SubscriptionUsage = {
  cloudProjects: number | null;
  ai: Awaited<ReturnType<typeof creditBalance>> | null;
};

/** A failed count is unknown, never zero. Deleted projects do not use quota. */
export async function getSubscriptionUsage(
  userId: string,
): Promise<SubscriptionUsage> {
  const supabase = await createClient();
  const [cloud, ai] = await Promise.allSettled([
    supabase
      .from("tiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),
    creditBalance(),
  ]);
  return {
    cloudProjects:
      cloud.status === "fulfilled" && !cloud.value.error
        ? cloud.value.count
        : null,
    ai: ai.status === "fulfilled" ? ai.value : null,
  };
}
