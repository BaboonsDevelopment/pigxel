import { TIERS, type BillingCycle, type Tier } from "./pricing";

export type SubscriptionRecord = {
  id: string;
  userId: string;
  customerId: string;
  status: "active" | "trialing" | "past_due" | "paused" | "canceled";
  priceId: string;
  currentPeriodEndsAt: string | null;
  cancelsAt: string | null;
  eventAt: string;
  pendingPriceId?: string | null;
};

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

const PAID = new Set<SubscriptionRecord["status"]>([
  "active",
  "trialing",
  "past_due",
]);

type PlanPrice = { name: Tier["name"]; cycle: BillingCycle };

export type CurrentPlan =
  | { name: "Free" }
  | (PlanPrice & {
      subscriptionId: string;
      customerId: string;
      priceId: string;
      status: SubscriptionRecord["status"];
      renewsAt: string | null;
      cancelsAt: string | null;
      switchesTo: PlanPrice | null;
    });

export type PlanChange = "upgrade" | "downgrade" | "same";

const CYCLES: BillingCycle[] = ["month", "year"];

export function planOfPrice(priceId: string): PlanPrice | null {
  for (const tier of TIERS)
    for (const cycle of CYCLES)
      if (tier.priceId[cycle] === priceId) return { name: tier.name, cycle };
  return null;
}

const rank = ({ name, cycle }: PlanPrice) =>
  TIERS.findIndex((tier) => tier.name === name) * 2 + CYCLES.indexOf(cycle);

/** A higher tier, or yearly billing on the same tier, is an upgrade. */
export function planChange(from: string, to: string): PlanChange | null {
  const current = planOfPrice(from);
  const next = planOfPrice(to);
  if (!current || !next) return null;
  return from === to
    ? "same"
    : rank(next) > rank(current)
      ? "upgrade"
      : "downgrade";
}

export function canChangePlan(plan: CurrentPlan) {
  return (
    plan.name !== "Free" &&
    (plan.status === "active" || plan.status === "trialing") &&
    !plan.cancelsAt
  );
}

export function formatMoney(minorUnits: string, currency: string) {
  const format = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  });
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
  return format.format(Number(minorUnits) / 10 ** digits);
}

export function currentPlan(subscriptions: SubscriptionRecord[]): CurrentPlan {
  const latest = subscriptions
    .filter((sub) => PAID.has(sub.status))
    .sort((a, b) => b.eventAt.localeCompare(a.eventAt));
  for (const sub of latest) {
    const price = planOfPrice(sub.priceId);
    if (price)
      return {
        ...price,
        subscriptionId: sub.id,
        customerId: sub.customerId,
        priceId: sub.priceId,
        status: sub.status,
        renewsAt: sub.cancelsAt ? null : sub.currentPeriodEndsAt,
        cancelsAt: sub.cancelsAt,
        switchesTo: sub.pendingPriceId ? planOfPrice(sub.pendingPriceId) : null,
      };
  }
  return { name: "Free" };
}
