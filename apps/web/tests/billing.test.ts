import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canChangePlan,
  currentPlan,
  formatMoney,
  planChange,
  subscriptionRecord,
  type CreemSubscription,
  type SubscriptionRecord,
} from "@/features/billing/subscription";
import { aiAllowance, limitsOf, TIERS } from "@/features/billing/pricing";

vi.mock("server-only", () => ({}));
const saveSubscription = vi.fn();
vi.mock("@/features/billing/server", () => ({
  saveSubscription: (record: unknown) => saveSubscription(record),
}));

const USER = "0b6f7c0e-4b8a-4c56-9a4e-3f1f2d6c9a11";
const pro = TIERS.find((tier) => tier.name === "Pro")!;
const starter = TIERS.find((tier) => tier.name === "Starter")!;
const advanced = TIERS.find((tier) => tier.name === "Advanced")!;
const AT = "2026-10-01T12:00:00.000Z";

function subscription(
  overrides: Partial<CreemSubscription> = {},
): CreemSubscription {
  return {
    id: "sub_1",
    status: "active",
    product: { id: pro.productId.month },
    customer: { id: "cust_1" },
    current_period_end_date: "2026-11-01T12:00:00.000Z",
    metadata: { userId: USER },
    ...overrides,
  };
}

function record(
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord {
  return { ...subscriptionRecord(subscription(), AT)!, ...overrides };
}

describe("subscription record", () => {
  it("maps a Creem subscription to the stored row", () => {
    expect(subscriptionRecord(subscription(), AT)).toEqual({
      id: "sub_1",
      userId: USER,
      customerId: "cust_1",
      status: "active",
      productId: pro.productId.month,
      currentPeriodEndsAt: "2026-11-01T12:00:00.000Z",
      cancelsAt: null,
      eventAt: AT,
    });
  });

  it("accepts products and customers given as IDs", () => {
    expect(
      subscriptionRecord(
        subscription({ product: pro.productId.year, customer: "cust_2" }),
        AT,
      ),
    ).toMatchObject({ productId: pro.productId.year, customerId: "cust_2" });
  });

  it("keeps a scheduled cancellation active until the period ends", () => {
    expect(
      subscriptionRecord(subscription({ status: "scheduled_cancel" }), AT),
    ).toMatchObject({
      status: "active",
      cancelsAt: "2026-11-01T12:00:00.000Z",
    });
  });

  it("skips subscriptions that aren't tied to an account or have unknown statuses", () => {
    expect(subscriptionRecord(subscription({ metadata: null }), AT)).toBeNull();
    expect(
      subscriptionRecord(subscription({ metadata: { userId: "someone" } }), AT),
    ).toBeNull();
    expect(
      subscriptionRecord(subscription({ status: "mystery" }), AT),
    ).toBeNull();
  });

  it("uses the account the caller already knows", () => {
    expect(
      subscriptionRecord(subscription({ metadata: null }), AT, USER)?.userId,
    ).toBe(USER);
  });
});

describe("plan limits", () => {
  it("gives each plan its cloud room and AI tokens", () => {
    expect(limitsOf("Free")).toEqual({ cloudTiles: 5, aiTokens: 0 });
    expect(limitsOf("Starter")).toEqual({ cloudTiles: 50, aiTokens: 1000 });
    expect(limitsOf("Pro")).toEqual({ cloudTiles: 100, aiTokens: 2000 });
    expect(limitsOf("Advanced")).toEqual({ cloudTiles: 200, aiTokens: 7000 });
  });

  it("gives Free no AI and counts paid tokens per calendar month", () => {
    const now = new Date("2026-10-13T08:00:00Z");
    expect(aiAllowance("Free", now)).toEqual({
      tokens: 0,
      since: null,
      resetsAt: null,
    });
    expect(aiAllowance("Pro", now)).toEqual({
      tokens: 2000,
      since: "2026-10-01T00:00:00.000Z",
      resetsAt: "2026-11-01T00:00:00.000Z",
    });
    expect(
      aiAllowance("Starter", new Date("2026-12-31T23:59:00Z")).resetsAt,
    ).toBe("2027-01-01T00:00:00.000Z");
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
    expect(currentPlan([record({ productId: pro.productId.year })])).toEqual({
      name: "Pro",
      cycle: "year",
      subscriptionId: "sub_1",
      customerId: "cust_1",
      productId: pro.productId.year,
      status: "active",
      renewsAt: "2026-11-01T12:00:00.000Z",
      cancelsAt: null,
      switchesTo: null,
    });
  });

  it("shows a downgrade waiting for renewal", () => {
    const plan = currentPlan([
      record({ pendingProductId: starter.productId.month }),
    ]);
    expect(plan).toMatchObject({
      switchesTo: { name: "Starter", cycle: "month" },
    });
  });

  it("doesn't renew once a cancellation is scheduled", () => {
    const plan = currentPlan([
      record({ cancelsAt: "2026-11-01T12:00:00.000Z" }),
    ]);
    expect(plan).toMatchObject({
      renewsAt: null,
      cancelsAt: "2026-11-01T12:00:00.000Z",
    });
  });
});

describe("plan changes", () => {
  it("treats a higher tier or yearly billing as an upgrade", () => {
    expect(planChange(starter.productId.month, pro.productId.month)).toBe(
      "upgrade",
    );
    expect(planChange(pro.productId.month, pro.productId.year)).toBe("upgrade");
    expect(planChange(pro.productId.year, advanced.productId.month)).toBe(
      "upgrade",
    );
  });

  it("treats a lower tier or monthly billing as a downgrade", () => {
    expect(planChange(pro.productId.month, starter.productId.year)).toBe(
      "downgrade",
    );
    expect(planChange(pro.productId.year, pro.productId.month)).toBe(
      "downgrade",
    );
  });

  it("knows staying put and rejects unknown prices", () => {
    expect(planChange(pro.productId.month, pro.productId.month)).toBe("same");
    expect(planChange(pro.productId.month, "prod_unknown")).toBeNull();
  });

  it("allows changes only on a healthy plan that isn't ending", () => {
    const plan = (overrides: Partial<SubscriptionRecord>) =>
      currentPlan([record(overrides)]);
    expect(canChangePlan(plan({}))).toBe(true);
    expect(canChangePlan(plan({ status: "past_due" }))).toBe(false);
    expect(canChangePlan(plan({ cancelsAt: "2026-11-01T12:00:00.000Z" }))).toBe(
      false,
    );
    expect(canChangePlan({ name: "Free" })).toBe(false);
  });

  it("formats amounts in minor units", () => {
    expect(formatMoney("1234", "USD")).toBe("$12.34");
    expect(formatMoney("1234", "JPY")).toBe("¥1,234");
  });
});

describe("Creem webhook", () => {
  const SECRET = "whsec_test_secret";

  async function post(body: string, signature?: string) {
    const { POST } = await import("@/app/api/creem/webhook/route");
    const headers = new Headers();
    if (signature) headers.set("creem-signature", signature);
    return POST(
      new Request("http://localhost/api/creem/webhook", {
        method: "POST",
        headers,
        body,
      }),
    );
  }

  const sign = (body: string, secret = SECRET) =>
    createHmac("sha256", secret).update(body).digest("hex");

  const body = JSON.stringify({
    id: "evt_1",
    eventType: "subscription.paid",
    created_at: Date.parse(AT),
    object: {
      ...subscription(),
      object: "subscription",
      product: { id: pro.productId.month, price: 1000, currency: "USD" },
      customer: { id: "cust_1", email: "artist@example.com" },
      status: "active",
    },
  });

  beforeEach(() => {
    vi.stubEnv("CREEM_WEBHOOK_SECRET", SECRET);
    saveSubscription.mockResolvedValue(null);
  });

  it("stores a signed subscription event", async () => {
    const response = await post(body, sign(body));
    expect(response.status).toBe(200);
    expect(saveSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sub_1",
        userId: USER,
        productId: pro.productId.month,
        eventAt: AT,
      }),
    );
  });

  it("ignores other events", async () => {
    const other = JSON.stringify({
      eventType: "refund.created",
      created_at: 1,
      object: {},
    });
    expect((await post(other, sign(other))).status).toBe(200);
    expect(saveSubscription).not.toHaveBeenCalled();
  });

  it("rejects missing or forged signatures", async () => {
    expect((await post(body)).status).toBe(400);
    expect((await post(body, sign(body, "wrong"))).status).toBe(401);
    expect((await post(body, "not-hex")).status).toBe(401);
    expect(saveSubscription).not.toHaveBeenCalled();
  });

  it("asks Creem to retry when storing fails", async () => {
    saveSubscription.mockResolvedValue({ code: "XX000", message: "down" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post(body, sign(body))).status).toBe(500);
  });
});
