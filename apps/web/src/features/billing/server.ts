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
  pending_price_id: string | null;
};

const COLUMNS =
  "id, user_id, customer_id, status, price_id, current_period_ends_at, cancels_at, event_at, pending_price_id";

const recordOfRow = (row: SubscriptionRow): SubscriptionRecord => ({
  id: row.id,
  userId: row.user_id,
  customerId: row.customer_id,
  status: row.status,
  priceId: row.price_id,
  currentPeriodEndsAt: row.current_period_ends_at,
  cancelsAt: row.cancels_at,
  eventAt: row.event_at,
  pendingPriceId: row.pending_price_id,
});

export const getCurrentPlan = cache(
  async (userId: string): Promise<CurrentPlan> => {
    if (!isSupabaseConfigured()) return { name: "Free" };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select(COLUMNS)
      .eq("user_id", userId)
      .returns<SubscriptionRow[]>();
    if (error) {
      console.error("Couldn’t load the subscription:", error.message);
      return { name: "Free" };
    }
    return currentPlan(data.map(recordOfRow));
  },
);

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

export async function setPendingPrice(
  subscriptionId: string,
  userId: string,
  priceId: string | null,
) {
  const { error } = await createAdminClient()
    .from("subscriptions")
    .update({ pending_price_id: priceId, updated_at: new Date().toISOString() })
    .eq("id", subscriptionId)
    .eq("user_id", userId);
  return error;
}

/** Subscriptions with a downgrade due before `cutoff`. */
export async function dueDowngrades(cutoff: Date) {
  const { data, error } = await createAdminClient()
    .from("subscriptions")
    .select(COLUMNS)
    .not("pending_price_id", "is", null)
    .in("status", ["active", "trialing"])
    .is("cancels_at", null)
    .lte("current_period_ends_at", cutoff.toISOString())
    .returns<SubscriptionRow[]>();
  if (error) throw new Error(error.message);
  return data.map(recordOfRow);
}
