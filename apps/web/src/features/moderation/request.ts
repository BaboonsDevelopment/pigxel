import "server-only";
import { after } from "next/server";
import type { createClient } from "@/lib/supabase/server";
import { reviewTile } from "./review";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function requestReview(
  supabase: Supabase,
  tileId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("tiles")
    .update({
      review: "pending",
      review_requested_at: new Date().toISOString(),
    })
    .eq("id", tileId)
    .eq("user_id", userId)
    .neq("visibility", "public")
    .select("id");
  if (error)
    throw new Error(`Couldn’t send ${tileId} for review: ${error.message}`);
  if (data.length)
    after(() =>
      reviewTile(tileId).catch((e: unknown) =>
        console.error(`Couldn’t review ${tileId}:`, e),
      ),
    );
}
