import { NextResponse } from "next/server";
import { creemApi, storeSubscription } from "@/features/billing/creem";
import { dueDowngrades } from "@/features/billing/server";

// How long before renewal a downgrade is applied. Run this route at least
// this often (hourly) so no renewal is missed and nobody loses paid time.
const LEAD_MS = 2 * 60 * 60 * 1000;

// Applies downgrades that are due before the next renewal. Creem doesn't
// prorate the switch; the renewal then charges the new price.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not set.");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const due = await dueDowngrades(new Date(Date.now() + LEAD_MS));
  let failed = 0;
  for (const subscription of due) {
    try {
      await storeSubscription(
        await creemApi.switchProduct(
          subscription.id,
          subscription.pendingProductId!,
          "proration-none",
        ),
        subscription.userId,
      );
    } catch (error) {
      failed++;
      console.error(`Couldn’t downgrade ${subscription.id}:`, error);
    }
  }
  return NextResponse.json(
    { applied: due.length - failed, failed },
    { status: failed ? 500 : 200 },
  );
}
