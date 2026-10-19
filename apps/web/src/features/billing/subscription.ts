import {
  BILLABLE_TIERS,
  productIdFor,
  productMode,
  type BillingMode,
  type BillingCycle,
  type Tier,
} from "./pricing";

export type SubscriptionStatus =
  "active" | "trialing" | "past_due" | "paused" | "canceled" | "unpaid";

export type SubscriptionRecord = {
  id: string;
  userId: string;
  customerId: string;
  status: SubscriptionStatus;
  productId: string;
  currentPeriodEndsAt: string | null;
  cancelsAt: string | null;
  eventAt: string;
  pendingProductId?: string | null;
};

/** A subscription as Creem sends it in webhooks and API responses. */
export type CreemSubscription = {
  id: string;
  status: string;
  product: string | { id: string };
  customer: string | { id: string };
  current_period_end_date?: string | null;
  updated_at?: string;
  metadata?: Record<string, unknown> | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const idOf = (value: string | { id: string }) =>
  typeof value === "string" ? value : value.id;

const STATUSES = new Set<string>([
  "active",
  "trialing",
  "past_due",
  "paused",
  "canceled",
  "unpaid",
]);

/**
 * The row to store for a Creem subscription. The Pigxel account comes from
 * the checkout metadata, or `userId` when the caller already knows it.
 */
export function subscriptionRecord(
  subscription: CreemSubscription,
  eventAt: string,
  userId?: string,
): SubscriptionRecord | null {
  const owner = userId ?? subscription.metadata?.userId;
  if (typeof owner !== "string" || !UUID.test(owner)) return null;
  // A scheduled cancellation stays active until the period ends.
  const ending = subscription.status === "scheduled_cancel";
  const status = ending ? "active" : subscription.status;
  if (!STATUSES.has(status)) return null;
  const periodEnd = subscription.current_period_end_date ?? null;
  return {
    id: subscription.id,
    userId: owner,
    customerId: idOf(subscription.customer),
    status: status as SubscriptionStatus,
    productId: idOf(subscription.product),
    currentPeriodEndsAt: periodEnd,
    cancelsAt: ending ? periodEnd : null,
    eventAt,
  };
}

const PAID = new Set<SubscriptionStatus>(["active", "trialing", "past_due"]);

type PlanProduct = { name: Tier["name"]; cycle: BillingCycle };

export type CurrentPlan =
  | { name: "Free" }
  | (PlanProduct & {
      subscriptionId: string;
      customerId: string;
      productId: string;
      status: SubscriptionStatus;
      renewsAt: string | null;
      cancelsAt: string | null;
      switchesTo: PlanProduct | null;
    });

export type PlanChange = "upgrade" | "downgrade" | "same";

const CYCLES: BillingCycle[] = ["month", "year"];

export function planOfProduct(
  productId: string,
  mode?: BillingMode,
): PlanProduct | null {
  if (!productId) return null;
  for (const tier of BILLABLE_TIERS)
    for (const cycle of CYCLES)
      if (
        (mode ? [mode] : (["test", "live"] as const)).some(
          (candidate) => productIdFor(tier, cycle, candidate) === productId,
        ) ||
        (!mode && tier.archivedTestProductId?.[cycle] === productId)
      )
        return { name: tier.name, cycle };
  return null;
}

const rank = ({ name, cycle }: PlanProduct) =>
  BILLABLE_TIERS.findIndex((tier) => tier.name === name) * 2 +
  CYCLES.indexOf(cycle);

/** A higher tier, or yearly billing on the same tier, is an upgrade. */
export function planChange(from: string, to: string): PlanChange | null {
  const current = planOfProduct(from);
  const next = planOfProduct(to);
  if (!current || !next || productMode(from) !== productMode(to)) return null;
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
    const product = planOfProduct(sub.productId);
    if (product)
      return {
        ...product,
        subscriptionId: sub.id,
        customerId: sub.customerId,
        productId: sub.productId,
        status: sub.status,
        renewsAt: sub.cancelsAt ? null : sub.currentPeriodEndsAt,
        cancelsAt: sub.cancelsAt,
        switchesTo: sub.pendingProductId
          ? planOfProduct(sub.pendingProductId)
          : null,
      };
  }
  return { name: "Free" };
}
