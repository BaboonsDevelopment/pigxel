import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  currentPlan,
  subscriptionRecord,
  type SubscriptionEvent,
  type SubscriptionRecord,
} from "@/lib/billing/subscription";
import { TIERS } from "@/lib/pricing";

vi.mock("server-only", () => ({}));
const saveSubscription = vi.fn();
vi.mock("@/lib/billing/server", () => ({
  saveSubscription: (record: unknown) => saveSubscription(record),
}));

const USER = "0b6f7c0e-4b8a-4c56-9a4e-3f1f2d6c9a11";
const pro = TIERS.find((tier) => tier.name === "Pro")!;

function event(
  overrides: Partial<SubscriptionEvent["data"]> = {},
): SubscriptionEvent {
  return {
    occurredAt: "2026-10-01T12:00:00Z",
    data: {
      id: "sub_1",
      status: "active",
      customerId: "ctm_1",
      items: [{ price: { id: pro.priceId.month } }],
      currentBillingPeriod: { endsAt: "2026-11-01T12:00:00Z" },
      scheduledChange: null,
      customData: { userId: USER },
      ...overrides,
    },
  };
}

function record(
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord {
  return { ...subscriptionRecord(event())!, ...overrides };
}

describe("subscription record", () => {
  it("maps a Paddle event to the stored row", () => {
    expect(subscriptionRecord(event())).toEqual({
      id: "sub_1",
      userId: USER,
      customerId: "ctm_1",
      status: "active",
      priceId: pro.priceId.month,
      currentPeriodEndsAt: "2026-11-01T12:00:00Z",
      cancelsAt: null,
      eventAt: "2026-10-01T12:00:00Z",
    });
  });

  it("keeps a scheduled cancellation", () => {
    const scheduledChange = {
      action: "cancel",
      effectiveAt: "2026-11-01T12:00:00Z",
    };
    expect(subscriptionRecord(event({ scheduledChange }))?.cancelsAt).toBe(
      "2026-11-01T12:00:00Z",
    );
  });

  it("skips events that aren't tied to an account", () => {
    expect(subscriptionRecord(event({ customData: null }))).toBeNull();
    expect(
      subscriptionRecord(event({ customData: { userId: "someone" } })),
    ).toBeNull();
  });
});

describe("current plan", () => {
  it("is Free without a paid subscription", () => {
    expect(currentPlan([])).toEqual({ name: "Free" });
    expect(currentPlan([record({ status: "canceled" })])).toEqual({
      name: "Free",
    });
  });

  it("names the tier and cycle of the price", () => {
    expect(currentPlan([record({ priceId: pro.priceId.year })])).toEqual({
      name: "Pro",
      cycle: "year",
      status: "active",
      renewsAt: "2026-11-01T12:00:00Z",
      cancelsAt: null,
    });
  });

  it("doesn't renew once a cancellation is scheduled", () => {
    const plan = currentPlan([record({ cancelsAt: "2026-11-01T12:00:00Z" })]);
    expect(plan).toMatchObject({
      renewsAt: null,
      cancelsAt: "2026-11-01T12:00:00Z",
    });
  });
});

describe("Paddle webhook", () => {
  const SECRET = "pdl_ntfset_test_secret";

  async function post(body: string, signature?: string) {
    const { POST } = await import("@/app/api/paddle/webhook/route");
    const headers = new Headers();
    if (signature) headers.set("paddle-signature", signature);
    return POST(
      new Request("http://localhost/api/paddle/webhook", {
        method: "POST",
        headers,
        body,
      }),
    );
  }

  function sign(body: string, secret = SECRET) {
    const ts = Math.floor(Date.now() / 1000);
    const h1 = createHmac("sha256", secret)
      .update(`${ts}:${body}`)
      .digest("hex");
    return `ts=${ts};h1=${h1}`;
  }

  const body = JSON.stringify({
    event_id: "evt_1",
    notification_id: "ntf_1",
    event_type: "subscription.created",
    occurred_at: "2026-10-01T12:00:00Z",
    data: {
      id: "sub_1",
      status: "active",
      customer_id: "ctm_1",
      address_id: "add_1",
      business_id: null,
      currency_code: "USD",
      created_at: "2026-10-01T12:00:00Z",
      updated_at: "2026-10-01T12:00:00Z",
      started_at: "2026-10-01T12:00:00Z",
      first_billed_at: "2026-10-01T12:00:00Z",
      next_billed_at: "2026-11-01T12:00:00Z",
      paused_at: null,
      canceled_at: null,
      discount: null,
      collection_mode: "automatic",
      billing_details: null,
      current_billing_period: {
        starts_at: "2026-10-01T12:00:00Z",
        ends_at: "2026-11-01T12:00:00Z",
      },
      billing_cycle: { interval: "month", frequency: 1 },
      scheduled_change: null,
      items: [
        {
          status: "active",
          quantity: 1,
          recurring: true,
          created_at: "2026-10-01T12:00:00Z",
          updated_at: "2026-10-01T12:00:00Z",
          previously_billed_at: null,
          next_billed_at: null,
          trial_dates: null,
          price: {
            id: pro.priceId.month,
            product_id: "pro_1",
            description: "Pro monthly",
            type: "standard",
            name: null,
            billing_cycle: { interval: "month", frequency: 1 },
            trial_period: null,
            tax_mode: "account_setting",
            unit_price: { amount: "1000", currency_code: "USD" },
            unit_price_overrides: [],
            quantity: { minimum: 1, maximum: 1 },
            status: "active",
            custom_data: null,
            import_meta: null,
            created_at: "2026-10-01T12:00:00Z",
            updated_at: "2026-10-01T12:00:00Z",
          },
        },
      ],
      custom_data: { userId: USER },
      import_meta: null,
      transaction_id: "txn_1",
    },
  });

  beforeEach(() => {
    vi.stubEnv("PADDLE_WEBHOOK_SECRET", SECRET);
    saveSubscription.mockResolvedValue(null);
  });

  it("stores a signed subscription event", async () => {
    const response = await post(body, sign(body));
    expect(response.status).toBe(200);
    expect(saveSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sub_1",
        userId: USER,
        priceId: pro.priceId.month,
      }),
    );
  });

  it("rejects missing or forged signatures", async () => {
    expect((await post(body)).status).toBe(400);
    expect((await post(body, sign(body, "wrong"))).status).toBe(401);
    expect(saveSubscription).not.toHaveBeenCalled();
  });

  it("asks Paddle to retry when storing fails", async () => {
    saveSubscription.mockResolvedValue({ code: "XX000", message: "down" });
    expect((await post(body, sign(body))).status).toBe(500);
  });
});
