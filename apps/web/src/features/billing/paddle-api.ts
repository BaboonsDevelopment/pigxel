import "server-only";
import {
  Environment,
  Paddle,
  type Subscription,
} from "@paddle/paddle-node-sdk";
import { paddleEnvironment } from "./paddle";
import { saveSubscription } from "./server";
import { subscriptionRecord } from "./subscription";

export function paddleApi() {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error("Set PADDLE_API_KEY in apps/web/.env.local.");
  return new Paddle(key, {
    environment:
      paddleEnvironment() === "sandbox"
        ? Environment.sandbox
        : Environment.production,
  });
}

/** Stores what Paddle returned right away, without waiting for the webhook. */
export async function storeSubscription(subscription: Subscription) {
  const record = subscriptionRecord({
    occurredAt: subscription.updatedAt,
    data: subscription,
  });
  const error = record && (await saveSubscription(record));
  if (error)
    console.error("Couldn’t store the Paddle subscription:", error.message);
}
