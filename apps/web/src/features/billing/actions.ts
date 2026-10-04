"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { paddleApi, storeSubscription } from "./paddle-api";
import { getCurrentPlan, setPendingPrice } from "./server";
import {
  canChangePlan,
  formatMoney,
  planChange,
  type CurrentPlan,
  type PlanChange,
} from "./subscription";

const SUBSCRIPTION_PATH = "/settings/subscription";

export type PortalTarget = "overview" | "payment" | "cancel";

export type PlanPreview =
  | { change: Exclude<PlanChange, "same">; priceId: string; charge?: string }
  | { error: string };

type PaidPlan = Exclude<CurrentPlan, { name: "Free" }>;

async function paidPlan(): Promise<PaidPlan & { userId: string }> {
  const user = await requireUser();
  const plan = await getCurrentPlan(user.id);
  if (plan.name === "Free") redirect(SUBSCRIPTION_PATH);
  return { ...plan, userId: user.id };
}

const failed = (what: string, error: unknown, detail = "") => {
  console.error(`Couldn’t ${what}:`, error);
  return {
    error: `Couldn’t ${what}.${detail} Please try again, or contact us if it keeps happening.`,
  };
};

export async function openBillingPortal(target: PortalTarget) {
  const plan = await paidPlan();
  let url: string | undefined;
  try {
    const { urls } = await paddleApi().customerPortalSessions.create(
      plan.customerId,
      [plan.subscriptionId],
    );
    const links = urls.subscriptions.find((s) => s.id === plan.subscriptionId);
    url =
      target === "payment"
        ? links?.updateSubscriptionPaymentMethod
        : target === "cancel"
          ? links?.cancelSubscription
          : undefined;
    url ??= urls.general.overview;
  } catch (error) {
    console.error("Couldn’t open the Paddle customer portal:", error);
  }
  redirect(url ?? `${SUBSCRIPTION_PATH}?billing=error`);
}

export async function previewPlanChange(priceId: string): Promise<PlanPreview> {
  const plan = await paidPlan();
  const change = planChange(plan.priceId, priceId);
  if (!change || change === "same" || !canChangePlan(plan))
    return { error: "This plan can’t be changed right now." };
  if (change === "downgrade") return { change, priceId };
  try {
    const preview = await paddleApi().subscriptions.previewUpdate(
      plan.subscriptionId,
      {
        items: [{ priceId, quantity: 1 }],
        prorationBillingMode: "prorated_immediately",
      },
    );
    const totals = preview.immediateTransaction?.details.totals;
    return {
      change,
      priceId,
      charge: totals && formatMoney(totals.grandTotal, totals.currencyCode),
    };
  } catch (error) {
    return failed("work out the price of the new plan", error);
  }
}

export async function changePlan(
  priceId: string,
): Promise<{ error?: string } | void> {
  const plan = await paidPlan();
  const change = planChange(plan.priceId, priceId);
  if (!change || !canChangePlan(plan))
    return { error: "This plan can’t be changed right now." };
  if (change === "upgrade") {
    try {
      await storeSubscription(
        await paddleApi().subscriptions.update(plan.subscriptionId, {
          items: [{ priceId, quantity: 1 }],
          prorationBillingMode: "prorated_immediately",
          onPaymentFailure: "prevent_change",
        }),
      );
    } catch (error) {
      return failed(
        "upgrade your plan",
        error,
        " You weren’t charged and your plan is unchanged.",
      );
    }
  }
  const pending = change === "downgrade" ? priceId : null;
  const error = await setPendingPrice(
    plan.subscriptionId,
    plan.userId,
    pending,
  );
  if (error) return failed("save your plan change", error.message);
  revalidatePath("/", "layout");
}

export async function keepPlan(): Promise<{ error?: string } | void> {
  const plan = await paidPlan();
  if (plan.cancelsAt)
    try {
      await storeSubscription(
        await paddleApi().subscriptions.update(plan.subscriptionId, {
          scheduledChange: null,
        }),
      );
    } catch (error) {
      return failed("keep your plan", error);
    }
  const error = await setPendingPrice(plan.subscriptionId, plan.userId, null);
  if (error) return failed("keep your plan", error.message);
  revalidatePath("/", "layout");
}
