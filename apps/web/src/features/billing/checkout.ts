import "server-only";
import { creemApi, getBillingMode } from "./creem";
import { saveSubscription } from "./server";
import { planOfProduct, subscriptionRecord } from "./subscription";

const CHECKOUT_ID = /^ch_[A-Za-z0-9_-]{1,64}$/;

/** A return URL is only a lookup key. Creem's API and account metadata prove ownership/payment. */
export async function confirmCreemCheckout(
  checkoutId: string,
  userId: string,
): Promise<boolean> {
  if (!CHECKOUT_ID.test(checkoutId)) return false;
  const checkout = await creemApi.retrieveCheckout(checkoutId);
  const mode = getBillingMode();
  if (
    checkout.id !== checkoutId ||
    checkout.status !== "completed" ||
    checkout.metadata?.userId !== userId ||
    checkout.mode !== (mode === "test" ? "test" : "prod")
  )
    return false;
  const subscriptionId =
    typeof checkout.subscription === "string"
      ? checkout.subscription
      : checkout.subscription?.id;
  if (!subscriptionId) return false;

  // Fetch current state: an old completed checkout must not restore a canceled subscription.
  const subscription = await creemApi.retrieveSubscription(subscriptionId);
  const productId =
    typeof subscription.product === "string"
      ? subscription.product
      : subscription.product.id;
  const checkoutProduct =
    typeof checkout.product === "string"
      ? checkout.product
      : checkout.product.id;
  if (
    subscription.id !== subscriptionId ||
    productId !== checkoutProduct ||
    !planOfProduct(productId, mode) ||
    (subscription.metadata?.userId !== undefined &&
      subscription.metadata.userId !== userId)
  )
    return false;
  const eventAt = subscription.updated_at;
  if (!eventAt || !Number.isFinite(Date.parse(eventAt))) return false;
  const record = subscriptionRecord(
    subscription,
    new Date(eventAt).toISOString(),
    userId,
  );
  if (!record) return false;
  const error = await saveSubscription(record);
  if (error?.code === "23503") return false;
  if (error)
    throw new Error(
      `Couldn’t confirm the checkout (${error.code ?? "store_failed"}).`,
    );
  return ["active", "trialing", "past_due"].includes(record.status);
}
