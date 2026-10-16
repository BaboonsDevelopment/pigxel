import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  currentPlan,
  planOfProduct,
  type CurrentPlan,
  type SubscriptionRecord,
} from "./subscription";
import { aiAllowance } from "./pricing";

type SubscriptionRow = {
  id: string;
  user_id: string;
  customer_id: string;
  status: SubscriptionRecord["status"];
  product_id: string;
  current_period_ends_at: string | null;
  cancels_at: string | null;
  event_at: string;
  pending_product_id: string | null;
};

const COLUMNS =
  "id, user_id, customer_id, status, product_id, current_period_ends_at, cancels_at, event_at, pending_product_id";

const recordOfRow = (row: SubscriptionRow): SubscriptionRecord => ({
  id: row.id,
  userId: row.user_id,
  customerId: row.customer_id,
  status: row.status,
  productId: row.product_id,
  currentPeriodEndsAt: row.current_period_ends_at,
  cancelsAt: row.cancels_at,
  eventAt: row.event_at,
  pendingProductId: row.pending_product_id,
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
  const { error } = await createAdminClient().rpc("apply_creem_subscription", {
    p_id: record.id,
    p_user_id: record.userId,
    p_customer_id: record.customerId,
    p_status: record.status,
    p_product_id: record.productId,
    p_plan: planOfProduct(record.productId)?.name.toLowerCase() ?? null,
    p_current_period_ends_at: record.currentPeriodEndsAt,
    p_cancels_at: record.cancelsAt,
    p_event_at: record.eventAt,
  });
  return error;
}

export async function setPendingProduct(
  subscriptionId: string,
  userId: string,
  productId: string | null,
) {
  const { error } = await createAdminClient()
    .from("subscriptions")
    .update({
      pending_product_id: productId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId)
    .eq("user_id", userId);
  return error;
}

/** Subscriptions with a downgrade due before `cutoff`. */
export async function dueDowngrades(cutoff: Date) {
  const { data, error } = await createAdminClient()
    .from("subscriptions")
    .select(COLUMNS)
    .not("pending_product_id", "is", null)
    .in("status", ["active", "trialing"])
    .is("cancels_at", null)
    .lte("current_period_ends_at", cutoff.toISOString())
    .returns<SubscriptionRow[]>();
  if (error) throw new Error(error.message);
  return data.map(recordOfRow);
}

/**
 * Whether the plan includes the AI helper: the same rule the AI actions
 * apply before running (plans with AI tokens).
 */
export async function hasAiAccess(userId: string) {
  return aiAllowance((await getCurrentPlan(userId)).name).tokens > 0;
}

/** Premium assets and tutorials: paid plans, and admins who make them. */
export async function hasPremiumAccess(user: User) {
  return isAdmin(user) || (await getCurrentPlan(user.id)).name !== "Free";
}
