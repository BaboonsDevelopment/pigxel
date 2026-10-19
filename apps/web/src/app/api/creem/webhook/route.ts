import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { saveSubscription } from "@/features/billing/server";
import { confirmCreemCheckout } from "@/features/billing/checkout";
import {
  subscriptionRecord,
  type CreemSubscription,
} from "@/features/billing/subscription";

const SUBSCRIPTION_EVENTS = new Set<string>([
  "subscription.active",
  "subscription.paid",
  "subscription.update",
  "subscription.trialing",
  "subscription.paused",
  "subscription.past_due",
  "subscription.unpaid",
  "subscription.scheduled_cancel",
  "subscription.canceled",
  "subscription.expired",
]);

type CreemEvent = {
  eventType: string;
  /** Milliseconds since the epoch. */
  created_at: number;
  object: CreemSubscription;
};

function signedBy(secret: string, body: string, signature: string) {
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  const secret = process.env.CREEM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CREEM_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const signature = request.headers.get("creem-signature");
  const body = await request.text();
  if (!signature)
    return NextResponse.json({ error: "unsigned" }, { status: 400 });
  if (!signedBy(secret, body, signature))
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });

  let event: CreemEvent;
  try {
    event = JSON.parse(body) as CreemEvent;
  } catch {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }
  if (event.eventType === "checkout.completed") {
    const owner = event.object?.metadata?.userId;
    if (typeof owner !== "string") {
      console.warn("Creem checkout.completed without a Pigxel userId.");
      return NextResponse.json({ ok: true });
    }
    try {
      await confirmCreemCheckout(event.object.id, owner);
    } catch (error) {
      console.error("Couldn’t confirm the Creem checkout:", error);
      return NextResponse.json(
        { error: "checkout_confirmation_failed" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  }
  if (!SUBSCRIPTION_EVENTS.has(event.eventType))
    return NextResponse.json({ ok: true });

  const record = subscriptionRecord(
    event.object,
    new Date(event.created_at).toISOString(),
  );
  if (!record) {
    console.warn(
      `Creem ${event.eventType} without a Pigxel userId or with an unknown status (subscription ${event.object?.id}, status ${event.object?.status}). Link it to an account by hand.`,
    );
    return NextResponse.json({ ok: true });
  }

  const error = await saveSubscription(record);
  // 23503: the account was deleted; nothing to keep.
  if (error && error.code !== "23503") {
    console.error("Couldn’t store the Creem subscription:", error.message);
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
