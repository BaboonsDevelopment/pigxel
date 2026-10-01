import { NextResponse } from "next/server";
import { EventName, NodeRuntime, Webhooks } from "@paddle/paddle-node-sdk";
import { saveSubscription } from "@/lib/billing/server";
import { subscriptionRecord } from "@/lib/billing/subscription";

const SUBSCRIPTION_EVENTS = new Set<string>([
  EventName.SubscriptionCreated,
  EventName.SubscriptionUpdated,
  EventName.SubscriptionActivated,
  EventName.SubscriptionCanceled,
  EventName.SubscriptionPastDue,
  EventName.SubscriptionPaused,
  EventName.SubscriptionResumed,
  EventName.SubscriptionTrialing,
]);

/**
 * Paddle's notification destination. Every request is verified against
 * `PADDLE_WEBHOOK_SECRET`; subscription events are stored for the account
 * in their `customData.userId`. A non-2xx answer makes Paddle retry.
 */
export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("PADDLE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const signature = request.headers.get("paddle-signature");
  const body = await request.text();
  if (!signature)
    return NextResponse.json({ error: "unsigned" }, { status: 400 });

  let event;
  try {
    // A Paddle client sets this up itself; verifying alone needs no API key.
    NodeRuntime.initialize();
    event = await new Webhooks().unmarshal(body, secret, signature);
  } catch {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  if (!SUBSCRIPTION_EVENTS.has(event.eventType))
    return NextResponse.json({ ok: true });

  const record = subscriptionRecord(
    event as Parameters<typeof subscriptionRecord>[0],
  );
  if (!record) {
    // Bought while signed out: nothing ties it to an account yet.
    console.warn(`Paddle ${event.eventType} without a Pigxel userId.`);
    return NextResponse.json({ ok: true });
  }

  const error = await saveSubscription(record);
  // 23503: the account was deleted; retrying won't help.
  if (error && error.code !== "23503") {
    console.error("Couldn’t store the Paddle subscription:", error.message);
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
