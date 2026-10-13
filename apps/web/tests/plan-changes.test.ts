import { beforeEach, describe, expect, it, vi } from "vitest";
import { TIERS } from "@/features/billing/pricing";
import type { CurrentPlan } from "@/features/billing/subscription";

const mocks = vi.hoisted(() => ({
  plan: vi.fn(),
  setPending: vi.fn(),
  due: vi.fn(),
  store: vi.fn(),
  checkout: vi.fn(),
  portal: vi.fn(),
  switchProduct: vi.fn(),
  cancel: vi.fn(),
  resume: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ id: "user-1", email: "artist@example.com" }),
}));
vi.mock("@/features/billing/server", () => ({
  getCurrentPlan: mocks.plan,
  setPendingProduct: mocks.setPending,
  dueDowngrades: mocks.due,
}));
vi.mock("@/features/billing/creem", () => ({
  creemApi: {
    createCheckout: mocks.checkout,
    portalLink: mocks.portal,
    switchProduct: mocks.switchProduct,
    cancelAtPeriodEnd: mocks.cancel,
    resume: mocks.resume,
  },
  storeSubscription: mocks.store,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import {
  cancelPlan,
  changePlan,
  keepPlan,
  openBillingPortal,
  previewPlanChange,
  startCheckout,
} from "@/features/billing/actions";
import { GET } from "@/app/api/billing/downgrades/route";

const [starter, pro] = TIERS;

const paid = (
  overrides: Partial<Exclude<CurrentPlan, { name: "Free" }>> = {},
): CurrentPlan => ({
  name: "Pro",
  cycle: "month",
  subscriptionId: "sub_1",
  customerId: "cust_1",
  productId: pro!.productId.month,
  status: "active",
  renewsAt: "2026-11-01T12:00:00Z",
  cancelsAt: null,
  switchesTo: null,
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_URL", "https://www.pigxel.studio");
  mocks.plan.mockResolvedValue(paid());
  mocks.setPending.mockResolvedValue(null);
  mocks.switchProduct.mockResolvedValue({ id: "sub_1" });
  mocks.cancel.mockResolvedValue({ id: "sub_1" });
  mocks.resume.mockResolvedValue({ id: "sub_1" });
});

describe("checkout", () => {
  it("sends Free accounts to Creem with their account attached", async () => {
    mocks.plan.mockResolvedValue({ name: "Free" });
    mocks.checkout.mockResolvedValue("https://checkout.creem.io/ch_1");
    await expect(startCheckout(pro!.productId.year)).rejects.toThrow(
      "REDIRECT:https://checkout.creem.io/ch_1",
    );
    expect(mocks.checkout).toHaveBeenCalledWith({
      productId: pro!.productId.year,
      userId: "user-1",
      email: "artist@example.com",
      successUrl: "https://www.pigxel.studio/welcome",
    });
  });

  it("offers a plan change to subscribers instead of a second subscription", async () => {
    await expect(startCheckout(starter!.productId.month)).rejects.toThrow(
      `REDIRECT:/settings/subscription?plan=${starter!.productId.month}`,
    );
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("ignores unknown products and reports Creem failures", async () => {
    await expect(startCheckout("prod_unknown")).rejects.toThrow(
      "REDIRECT:/pricing",
    );
    mocks.plan.mockResolvedValue({ name: "Free" });
    mocks.checkout.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(startCheckout(pro!.productId.month)).rejects.toThrow(
      "REDIRECT:/pricing?checkout=error",
    );
  });
});

describe("changing plans", () => {
  it("upgrades right away with a prorated charge", async () => {
    await changePlan(pro!.productId.year);
    expect(mocks.switchProduct).toHaveBeenCalledWith(
      "sub_1",
      pro!.productId.year,
      "proration-charge-immediately",
    );
    expect(mocks.store).toHaveBeenCalledWith({ id: "sub_1" }, "user-1");
    expect(mocks.setPending).toHaveBeenCalledWith("sub_1", "user-1", null);
  });

  it("keeps a downgrade for renewal without touching Creem", async () => {
    await changePlan(starter!.productId.month);
    expect(mocks.switchProduct).not.toHaveBeenCalled();
    expect(mocks.setPending).toHaveBeenCalledWith(
      "sub_1",
      "user-1",
      starter!.productId.month,
    );
  });

  it("leaves the plan alone when an upgrade payment fails", async () => {
    mocks.switchProduct.mockRejectedValue(new Error("declined"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await changePlan(pro!.productId.year);
    expect(result?.error).toMatch(/weren’t charged/);
    expect(mocks.setPending).not.toHaveBeenCalled();
  });

  it("refuses changes on unknown products, past-due or ending plans", async () => {
    expect(await changePlan("prod_unknown")).toHaveProperty("error");
    mocks.plan.mockResolvedValue(paid({ status: "past_due" }));
    expect(await changePlan(pro!.productId.year)).toHaveProperty("error");
    mocks.plan.mockResolvedValue(paid({ cancelsAt: "2026-11-01T12:00:00Z" }));
    expect(await changePlan(starter!.productId.month)).toHaveProperty("error");
    expect(mocks.switchProduct).not.toHaveBeenCalled();
    expect(mocks.setPending).not.toHaveBeenCalled();
  });

  it("sends Free accounts back to the subscription page", async () => {
    mocks.plan.mockResolvedValue({ name: "Free" });
    await expect(changePlan(pro!.productId.year)).rejects.toThrow(
      "REDIRECT:/settings/subscription",
    );
  });

  it("previews whether a change is an upgrade or a downgrade", async () => {
    expect(await previewPlanChange(pro!.productId.year)).toEqual({
      change: "upgrade",
      productId: pro!.productId.year,
    });
    expect(await previewPlanChange(starter!.productId.year)).toEqual({
      change: "downgrade",
      productId: starter!.productId.year,
    });
    expect(await previewPlanChange(pro!.productId.month)).toHaveProperty(
      "error",
    );
  });
});

describe("cancelling and keeping a plan", () => {
  it("cancels at the end of the period and drops a pending downgrade", async () => {
    await cancelPlan();
    expect(mocks.cancel).toHaveBeenCalledWith("sub_1");
    expect(mocks.store).toHaveBeenCalledWith({ id: "sub_1" }, "user-1");
    expect(mocks.setPending).toHaveBeenCalledWith("sub_1", "user-1", null);
  });

  it("doesn't cancel twice", async () => {
    mocks.plan.mockResolvedValue(paid({ cancelsAt: "2026-11-01T12:00:00Z" }));
    await cancelPlan();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  it("keeps the plan by resuming it and undoing a pending downgrade", async () => {
    mocks.plan.mockResolvedValue(paid({ cancelsAt: "2026-11-01T12:00:00Z" }));
    await keepPlan();
    expect(mocks.resume).toHaveBeenCalledWith("sub_1");
    expect(mocks.setPending).toHaveBeenCalledWith("sub_1", "user-1", null);
  });

  it("reports a failed cancellation", async () => {
    mocks.cancel.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await cancelPlan()).toHaveProperty("error");
    expect(mocks.setPending).not.toHaveBeenCalled();
  });
});

describe("billing portal", () => {
  it("opens the customer's Creem portal", async () => {
    mocks.portal.mockResolvedValue("https://creem.io/portal/cust_1");
    await expect(openBillingPortal()).rejects.toThrow(
      "REDIRECT:https://creem.io/portal/cust_1",
    );
    expect(mocks.portal).toHaveBeenCalledWith("cust_1");
  });

  it("comes back with an error when Creem fails", async () => {
    mocks.portal.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(openBillingPortal()).rejects.toThrow(
      "REDIRECT:/settings/subscription?billing=error",
    );
  });
});

describe("downgrade job", () => {
  const call = (authorization?: string) =>
    GET(
      new Request("http://localhost/api/billing/downgrades", {
        headers: authorization ? { authorization } : {},
      }),
    );

  const due = [
    {
      id: "sub_1",
      userId: "user-1",
      pendingProductId: starter!.productId.month,
    },
  ];

  beforeEach(() => vi.stubEnv("CRON_SECRET", "cron-secret"));

  it("needs the cron secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(mocks.due).not.toHaveBeenCalled();
  });

  it("switches due subscriptions without prorating them", async () => {
    mocks.due.mockResolvedValue(due);
    const response = await call("Bearer cron-secret");
    expect(await response.json()).toEqual({ applied: 1, failed: 0 });
    expect(mocks.switchProduct).toHaveBeenCalledWith(
      "sub_1",
      starter!.productId.month,
      "proration-none",
    );
    expect(mocks.store).toHaveBeenCalledWith({ id: "sub_1" }, "user-1");
    const cutoff = mocks.due.mock.calls[0]![0] as Date;
    expect(cutoff.getTime()).toBeGreaterThan(Date.now());
  });

  it("reports failures so the scheduler retries", async () => {
    mocks.due.mockResolvedValue(due);
    mocks.switchProduct.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await call("Bearer cron-secret");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ applied: 0, failed: 1 });
  });
});
