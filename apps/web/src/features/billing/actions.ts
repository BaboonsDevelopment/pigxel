"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/config";
import { creemApi, storeSubscription } from "./creem";
import { getCurrentPlan, hasAiAccess, setPendingProduct } from "./server";
import {
  canChangePlan,
  planChange,
  planOfProduct,
  type CurrentPlan,
  type PlanChange,
} from "./subscription";

const SUBSCRIPTION_PATH = "/settings/subscription";

export type PlanPreview =
  | { change: Exclude<PlanChange, "same">; productId: string }
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

/** Sends the person to Creem's checkout for a plan, or to plan changes if they already pay. */
export async function startCheckout(productId: string) {
  const user = await requireUser();
  if (!planOfProduct(productId)) redirect("/pricing");
  const plan = await getCurrentPlan(user.id);
  if (plan.name !== "Free")
    redirect(`${SUBSCRIPTION_PATH}?plan=${encodeURIComponent(productId)}`);
  let url: string | undefined;
  try {
    url = await creemApi.createCheckout({
      productId,
      userId: user.id,
      email: user.email,
      successUrl: authUrl("/welcome"),
    });
  } catch (error) {
    console.error("Couldn’t start a Creem checkout:", error);
  }
  redirect(url ?? "/pricing?checkout=error");
}

export async function openBillingPortal() {
  const plan = await paidPlan();
  let url: string | undefined;
  try {
    url = await creemApi.portalLink(plan.customerId);
  } catch (error) {
    console.error("Couldn’t open the Creem customer portal:", error);
  }
  redirect(url ?? `${SUBSCRIPTION_PATH}?billing=error`);
}

export async function previewPlanChange(
  productId: string,
): Promise<PlanPreview> {
  const plan = await paidPlan();
  const change = planChange(plan.productId, productId);
  if (!change || change === "same" || !canChangePlan(plan))
    return { error: "This plan can’t be changed right now." };
  return { change, productId };
}

export async function changePlan(
  productId: string,
): Promise<{ error?: string } | void> {
  const plan = await paidPlan();
  const change = planChange(plan.productId, productId);
  if (!change || !canChangePlan(plan))
    return { error: "This plan can’t be changed right now." };
  if (change === "upgrade") {
    try {
      await storeSubscription(
        await creemApi.switchProduct(
          plan.subscriptionId,
          productId,
          "proration-charge-immediately",
        ),
        plan.userId,
      );
    } catch (error) {
      return failed(
        "upgrade your plan",
        error,
        " You weren’t charged and your plan is unchanged.",
      );
    }
  }
  const pending = change === "downgrade" ? productId : null;
  const error = await setPendingProduct(
    plan.subscriptionId,
    plan.userId,
    pending,
  );
  if (error) return failed("save your plan change", error.message);
  revalidatePath("/", "layout");
}

export async function cancelPlan(): Promise<{ error?: string } | void> {
  const plan = await paidPlan();
  if (!plan.cancelsAt)
    try {
      await storeSubscription(
        await creemApi.cancelAtPeriodEnd(plan.subscriptionId),
        plan.userId,
      );
    } catch (error) {
      return failed("cancel your plan", error);
    }
  const error = await setPendingProduct(plan.subscriptionId, plan.userId, null);
  if (error) return failed("cancel your plan", error.message);
  revalidatePath("/", "layout");
}

export async function keepPlan(): Promise<{ error?: string } | void> {
  const plan = await paidPlan();
  if (plan.cancelsAt)
    try {
      await storeSubscription(
        await creemApi.resume(plan.subscriptionId),
        plan.userId,
      );
    } catch (error) {
      return failed("keep your plan", error);
    }
  const error = await setPendingProduct(plan.subscriptionId, plan.userId, null);
  if (error) return failed("keep your plan", error.message);
  revalidatePath("/", "layout");
}

/**
 * Whether the signed-in person's plan includes the AI helper. If the plan
 * can't be read, says yes: the AI still checks the plan when it runs.
 */
export async function canUseAi(): Promise<boolean> {
  const user = await requireUser();
  return hasAiAccess(user.id).catch(() => true);
}
