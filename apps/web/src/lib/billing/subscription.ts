import { TIERS, type BillingCycle, type Tier } from "@/lib/pricing";

/** A Paddle subscription as the webhook stores it (see the migration). */
export type SubscriptionRecord = {
  id: string;
  userId: string;
  customerId: string;
  status: "active" | "trialing" | "past_due" | "paused" | "canceled";
  priceId: string;
  currentPeriodEndsAt: string | null;
  cancelsAt: string | null;
  eventAt: string;
};

/** The parts of a Paddle subscription event the webhook reads. */
export type SubscriptionEvent = {
  occurredAt: string;
  data: {
    id: string;
    status: SubscriptionRecord["status"];
    customerId: string;
    items: { price: { id: string } | null }[];
    currentBillingPeriod: { endsAt: string } | null;
    scheduledChange: { action: string; effectiveAt: string } | null;
    customData: Record<string, unknown> | null;
  };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The row to store for a Paddle subscription event, or null when it can't
 * be tied to a Pigxel account: checkout passes `customData.userId` only for
 * signed-in buyers.
 */
export function subscriptionRecord(
  event: SubscriptionEvent,
): SubscriptionRecord | null {
  const { data } = event;
  const userId = data.customData?.userId;
  const priceId = data.items.find((item) => item.price)?.price?.id;
  if (typeof userId !== "string" || !UUID.test(userId) || !priceId) return null;
  return {
    id: data.id,
    userId,
    customerId: data.customerId,
    status: data.status,
    priceId,
    currentPeriodEndsAt: data.currentBillingPeriod?.endsAt ?? null,
    cancelsAt:
      data.scheduledChange?.action === "cancel"
        ? data.scheduledChange.effectiveAt
        : null,
    eventAt: event.occurredAt,
  };
}

/** Statuses that keep a paid plan; past due keeps it while Paddle retries. */
const PAID = new Set<SubscriptionRecord["status"]>([
  "active",
  "trialing",
  "past_due",
]);

export type CurrentPlan =
  | { name: "Free" }
  | {
      name: Tier["name"];
      cycle: BillingCycle;
      status: SubscriptionRecord["status"];
      renewsAt: string | null;
      cancelsAt: string | null;
    };

/** The plan a person is on, from their subscriptions; Free without a paid one. */
export function currentPlan(subscriptions: SubscriptionRecord[]): CurrentPlan {
  const latest = subscriptions
    .filter((sub) => PAID.has(sub.status))
    .sort((a, b) => b.eventAt.localeCompare(a.eventAt));
  for (const sub of latest) {
    for (const tier of TIERS) {
      const cycle = (["month", "year"] as const).find(
        (c) => tier.priceId[c] === sub.priceId,
      );
      if (cycle)
        return {
          name: tier.name,
          cycle,
          status: sub.status,
          renewsAt: sub.cancelsAt ? null : sub.currentPeriodEndsAt,
          cancelsAt: sub.cancelsAt,
        };
    }
  }
  return { name: "Free" };
}
