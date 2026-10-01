import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  currentPlan,
  type CurrentPlan,
  type SubscriptionRecord,
} from "./subscription";

type SubscriptionRow = {
  id: string;
  user_id: string;
  customer_id: string;
  status: SubscriptionRecord["status"];
  price_id: string;
  current_period_ends_at: string | null;
  cancels_at: string | null;
  event_at: string;
};

/** The signed-in person's plan; Free when nothing is stored or it fails. */
export const getCurrentPlan = cache(
  async (userId: string): Promise<CurrentPlan> => {
    if (!isSupabaseConfigured()) return { name: "Free" };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        "id, user_id, customer_id, status, price_id, current_period_ends_at, cancels_at, event_at",
      )
      .eq("user_id", userId)
      .returns<SubscriptionRow[]>();
    if (error) {
      console.error("Couldn’t load the subscription:", error.message);
      return { name: "Free" };
    }
    return currentPlan(
      data.map((row) => ({
        id: row.id,
        userId: row.user_id,
        customerId: row.customer_id,
        status: row.status,
        priceId: row.price_id,
        currentPeriodEndsAt: row.current_period_ends_at,
        cancelsAt: row.cancels_at,
        eventAt: row.event_at,
      })),
    );
  },
);

/** Stores a subscription from the Paddle webhook, unless a newer event won. */
export async function saveSubscription(record: SubscriptionRecord) {
  const { error } = await createAdminClient().rpc("apply_paddle_subscription", {
    p_id: record.id,
    p_user_id: record.userId,
    p_customer_id: record.customerId,
    p_status: record.status,
    p_price_id: record.priceId,
    p_current_period_ends_at: record.currentPeriodEndsAt,
    p_cancels_at: record.cancelsAt,
    p_event_at: record.eventAt,
  });
  return error;
}
