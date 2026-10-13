import "server-only";
import { saveSubscription } from "./server";
import { subscriptionRecord, type CreemSubscription } from "./subscription";

type Env = Partial<Record<string, string>>;

/** Test keys (creem_test_…) talk to Creem's test API; live keys to the real one. */
export function creemHost(key: string) {
  return key.startsWith("creem_test_")
    ? "https://test-api.creem.io"
    : "https://api.creem.io";
}

export class CreemError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(
  path: string,
  body: Record<string, unknown>,
  env: Env = process.env,
): Promise<T> {
  const key = env.CREEM_API_KEY;
  if (!key) throw new Error("Set CREEM_API_KEY in apps/web/.env.local.");
  const response = await fetch(`${creemHost(key)}${path}`, {
    method: "POST",
    headers: { "x-api-key": key, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new CreemError(
      response.status,
      `Creem ${path} responded ${response.status}: ${detail}`,
    );
  }
  return (await response.json()) as T;
}

export const creemApi = {
  async createCheckout(args: {
    productId: string;
    userId: string;
    email?: string;
    successUrl: string;
  }) {
    const checkout = await call<{ checkout_url: string }>("/v1/checkouts", {
      product_id: args.productId,
      request_id: args.userId,
      success_url: args.successUrl,
      metadata: { userId: args.userId },
      ...(args.email && { customer: { email: args.email } }),
    });
    return checkout.checkout_url;
  },

  async portalLink(customerId: string) {
    const links = await call<{ customer_portal_link: string }>(
      "/v1/customers/billing",
      { customer_id: customerId },
    );
    return links.customer_portal_link;
  },

  /** Moves a subscription to another product: an upgrade or a downgrade. */
  switchProduct(
    subscriptionId: string,
    productId: string,
    behavior: "proration-charge-immediately" | "proration-none",
  ) {
    return call<CreemSubscription>(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/upgrade`,
      { product_id: productId, update_behavior: behavior },
    );
  },

  /** Ends the subscription when the paid period runs out. */
  cancelAtPeriodEnd(subscriptionId: string) {
    return call<CreemSubscription>(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
      { mode: "scheduled", onExecute: "cancel" },
    );
  },

  /** Ends the subscription now, e.g. before the account is deleted. */
  cancelNow(subscriptionId: string) {
    return call<CreemSubscription>(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
      { mode: "immediate" },
    );
  },

  /** Undoes a scheduled cancellation. */
  resume(subscriptionId: string) {
    return call<CreemSubscription>(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/resume`,
      {},
    );
  },
};

/** Stores what Creem returned right away, without waiting for the webhook. */
export async function storeSubscription(
  subscription: CreemSubscription,
  userId: string,
) {
  const record = subscriptionRecord(
    subscription,
    subscription.updated_at ?? new Date().toISOString(),
    userId,
  );
  const error = record && (await saveSubscription(record));
  if (error)
    console.error("Couldn’t store the Creem subscription:", error.message);
}
