import { NextResponse } from "next/server";
import { EventName, NodeRuntime, Webhooks } from "@paddle/paddle-node-sdk";
import { saveSubscription } from "@/features/billing/server";
import { subscriptionRecord } from "@/features/billing/subscription";

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
    console.warn(`Paddle ${event.eventType} without a Pigxel userId.`);
    return NextResponse.json({ ok: true });
  }

  const error = await saveSubscription(record);
  if (error && error.code !== "23503") {
    console.error("Couldn’t store the Paddle subscription:", error.message);
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
