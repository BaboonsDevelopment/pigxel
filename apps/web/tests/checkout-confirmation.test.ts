import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { TIERS } from "@/features/billing/pricing";

const mocks = vi.hoisted(() => ({
  checkout: vi.fn(),
  subscription: vi.fn(),
  save: vi.fn(),
  mode: vi.fn(),
}));
vi.mock("@/features/billing/creem", () => ({
  creemApi: {
    retrieveCheckout: mocks.checkout,
    retrieveSubscription: mocks.subscription,
  },
  getBillingMode: mocks.mode,
}));
vi.mock("@/features/billing/server", () => ({ saveSubscription: mocks.save }));
import { confirmCreemCheckout } from "@/features/billing/checkout";
import { POST } from "@/app/api/creem/webhook/route";

const USER = "0b6f7c0e-4b8a-4c56-9a4e-3f1f2d6c9a11";
const CHECKOUT = {
  id: "ch_test",
  status: "completed",
  mode: "test",
  product: { id: TIERS[1]!.productId.month },
  subscription: { id: "sub_test" },
  metadata: { userId: USER },
};
const SUBSCRIPTION = {
  id: "sub_test",
  status: "active",
  product: CHECKOUT.product,
  customer: "cust_test",
  updated_at: "2026-10-19T14:10:21.000Z",
  current_period_end_date: "2026-11-19T14:10:21.000Z",
  metadata: { userId: USER },
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.mode.mockReturnValue("test");
  mocks.checkout.mockResolvedValue(CHECKOUT);
  mocks.subscription.mockResolvedValue(SUBSCRIPTION);
  mocks.save.mockResolvedValue(null);
});

describe("checkout confirmation", () => {
  it("also confirms real checkouts using the live catalog", async () => {
    const product = { id: TIERS[1]!.liveProductId.month };
    mocks.mode.mockReturnValue("live");
    mocks.checkout.mockResolvedValue({ ...CHECKOUT, mode: "prod", product });
    mocks.subscription.mockResolvedValue({ ...SUBSCRIPTION, product });
    expect(await confirmCreemCheckout(CHECKOUT.id, USER)).toBe(true);
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ productId: product.id }),
    );
  });
  it("stores a provider-verified subscription for the matching account", async () => {
    expect(await confirmCreemCheckout(CHECKOUT.id, USER)).toBe(true);
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sub_test",
        userId: USER,
        status: "active",
        productId: TIERS[1]!.productId.month,
        eventAt: SUBSCRIPTION.updated_at,
      }),
    );
  });
  it("does not trust a successful return URL without a completed checkout", async () => {
    mocks.checkout.mockResolvedValue({ ...CHECKOUT, status: "pending" });
    expect(await confirmCreemCheckout(CHECKOUT.id, USER)).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("refuses another account's checkout", async () => {
    expect(await confirmCreemCheckout(CHECKOUT.id, "another-user")).toBe(false);
    expect(mocks.subscription).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects subscription ownership that disagrees with checkout metadata", async () => {
    mocks.subscription.mockResolvedValue({
      ...SUBSCRIPTION,
      metadata: { userId: "someone_else" },
    });
    expect(await confirmCreemCheckout(CHECKOUT.id, USER)).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("uses verified checkout ownership if subscription metadata is absent", async () => {
    mocks.subscription.mockResolvedValue({ ...SUBSCRIPTION, metadata: null });
    expect(await confirmCreemCheckout(CHECKOUT.id, USER)).toBe(true);
  });
  it("rejects test checkouts when configured for live payments", async () => {
    mocks.mode.mockReturnValue("live");
    expect(await confirmCreemCheckout(CHECKOUT.id, USER)).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects unrelated products even when a checkout is completed", async () => {
    mocks.subscription.mockResolvedValue({
      ...SUBSCRIPTION,
      product: "prod_unknown",
    });
    expect(await confirmCreemCheckout(CHECKOUT.id, USER)).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("fetches current state so revisiting an old checkout cannot restore a canceled plan", async () => {
    mocks.subscription.mockResolvedValue({
      ...SUBSCRIPTION,
      status: "canceled",
    });
    expect(await confirmCreemCheckout(CHECKOUT.id, USER)).toBe(false);
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: "canceled" }),
    );
  });
  it("never uses the current time to overwrite newer webhook events", async () => {
    mocks.subscription.mockResolvedValue({
      ...SUBSCRIPTION,
      updated_at: undefined,
    });
    expect(await confirmCreemCheckout(CHECKOUT.id, USER)).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("does not report a failed database write as premium activation", async () => {
    mocks.save.mockResolvedValue({ code: "XX000" });
    await expect(confirmCreemCheckout(CHECKOUT.id, USER)).rejects.toThrow(
      "XX000",
    );
  });
  it("ignores a payment whose account has since been deleted", async () => {
    mocks.save.mockResolvedValue({ code: "23503" });
    expect(await confirmCreemCheckout(CHECKOUT.id, USER)).toBe(false);
  });
  it("rejects invalid IDs without querying Creem", async () => {
    expect(await confirmCreemCheckout("https://evil.test", USER)).toBe(false);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
});

describe("checkout.completed webhook", () => {
  it("also activates an initial purchase when only checkout events are delivered", async () => {
    const secret = "test-webhook-secret";
    vi.stubEnv("CREEM_WEBHOOK_SECRET", secret);
    const body = JSON.stringify({
      eventType: "checkout.completed",
      object: CHECKOUT,
      created_at: Date.parse(SUBSCRIPTION.updated_at),
    });
    const response = await POST(
      new Request("http://localhost/api/creem/webhook", {
        method: "POST",
        body,
        headers: {
          "creem-signature": createHmac("sha256", secret)
            .update(body)
            .digest("hex"),
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER, id: "sub_test" }),
    );
  });
});
