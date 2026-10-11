import { beforeEach, describe, expect, it, vi } from "vitest";
import { TIERS } from "@/features/billing/pricing";
import type { CurrentPlan } from "@/features/billing/subscription";

const mocks = vi.hoisted(() => ({
  plan: vi.fn(),
  setPending: vi.fn(),
  due: vi.fn(),
  store: vi.fn(),
  update: vi.fn(),
  previewUpdate: vi.fn(),
  portal: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ id: "user-1" }),
}));
vi.mock("@/features/billing/server", () => ({
  getCurrentPlan: mocks.plan,
  setPendingPrice: mocks.setPending,
  dueDowngrades: mocks.due,
}));
vi.mock("@/features/billing/paddle-api", () => ({
  paddleApi: () => ({
    subscriptions: {
      update: mocks.update,
      previewUpdate: mocks.previewUpdate,
    },
    customerPortalSessions: { create: mocks.portal },
  }),
  storeSubscription: mocks.store,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import {
  changePlan,
  keepPlan,
  openBillingPortal,
  previewPlanChange,
} from "@/features/billing/actions";
import { GET } from "@/app/api/paddle/downgrades/route";

const [starter, pro] = TIERS;

const paid = (
  overrides: Partial<Exclude<CurrentPlan, { name: "Free" }>> = {},
): CurrentPlan => ({
  name: "Pro",
  cycle: "month",
  subscriptionId: "sub_1",
  customerId: "ctm_1",
  priceId: pro!.priceId.month,
  status: "active",
  renewsAt: "2026-11-01T12:00:00Z",
  cancelsAt: null,
  switchesTo: null,
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.plan.mockResolvedValue(paid());
  mocks.setPending.mockResolvedValue(null);
  mocks.update.mockResolvedValue({ id: "sub_1" });
});

describe("changing plans", () => {
  it("upgrades right away with a prorated charge", async () => {
    await changePlan(pro!.priceId.year);
    expect(mocks.update).toHaveBeenCalledWith("sub_1", {
      items: [{ priceId: pro!.priceId.year, quantity: 1 }],
      prorationBillingMode: "prorated_immediately",
      onPaymentFailure: "prevent_change",
    });
    expect(mocks.store).toHaveBeenCalledWith({ id: "sub_1" });
    expect(mocks.setPending).toHaveBeenCalledWith("sub_1", "user-1", null);
  });

  it("keeps a downgrade for renewal without touching Paddle", async () => {
    await changePlan(starter!.priceId.month);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.setPending).toHaveBeenCalledWith(
      "sub_1",
      "user-1",
      starter!.priceId.month,
    );
  });

  it("leaves the plan alone when an upgrade payment fails", async () => {
    mocks.update.mockRejectedValue(new Error("declined"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await changePlan(pro!.priceId.year);
    expect(result?.error).toMatch(/weren’t charged/);
    expect(mocks.setPending).not.toHaveBeenCalled();
  });

  it("refuses changes on unknown prices, past-due or ending plans", async () => {
    expect(await changePlan("pri_unknown")).toHaveProperty("error");
    mocks.plan.mockResolvedValue(paid({ status: "past_due" }));
    expect(await changePlan(pro!.priceId.year)).toHaveProperty("error");
    mocks.plan.mockResolvedValue(paid({ cancelsAt: "2026-11-01T12:00:00Z" }));
    expect(await changePlan(starter!.priceId.month)).toHaveProperty("error");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.setPending).not.toHaveBeenCalled();
  });

  it("sends Free accounts back to the subscription page", async () => {
    mocks.plan.mockResolvedValue({ name: "Free" });
    await expect(changePlan(pro!.priceId.year)).rejects.toThrow(
      "REDIRECT:/settings/subscription",
    );
  });

  it("previews what an upgrade costs today", async () => {
    mocks.previewUpdate.mockResolvedValue({
      immediateTransaction: {
        details: { totals: { grandTotal: "4250", currencyCode: "EUR" } },
      },
    });
    expect(await previewPlanChange(pro!.priceId.year)).toEqual({
      change: "upgrade",
      priceId: pro!.priceId.year,
      charge: "€42.50",
    });
    expect(await previewPlanChange(starter!.priceId.year)).toEqual({
      change: "downgrade",
      priceId: starter!.priceId.year,
    });
  });

  it("keeps the plan by undoing a cancellation and a pending downgrade", async () => {
    mocks.plan.mockResolvedValue(paid({ cancelsAt: "2026-11-01T12:00:00Z" }));
    await keepPlan();
    expect(mocks.update).toHaveBeenCalledWith("sub_1", {
      scheduledChange: null,
    });
    expect(mocks.setPending).toHaveBeenCalledWith("sub_1", "user-1", null);
  });
});

describe("billing portal", () => {
  it("opens the page for the chosen task", async () => {
    mocks.portal.mockResolvedValue({
      urls: {
        general: { overview: "https://portal/overview" },
        subscriptions: [
          {
            id: "sub_1",
            cancelSubscription: "https://portal/cancel",
            updateSubscriptionPaymentMethod: "https://portal/card",
          },
        ],
      },
    });
    await expect(openBillingPortal("payment")).rejects.toThrow(
      "REDIRECT:https://portal/card",
    );
    expect(mocks.portal).toHaveBeenCalledWith("ctm_1", ["sub_1"]);
    await expect(openBillingPortal("overview")).rejects.toThrow(
      "REDIRECT:https://portal/overview",
    );
  });

  it("comes back with an error when Paddle fails", async () => {
    mocks.portal.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(openBillingPortal("cancel")).rejects.toThrow(
      "REDIRECT:/settings/subscription?billing=error",
    );
  });
});

describe("downgrade job", () => {
  const call = (authorization?: string) =>
    GET(
      new Request("http://localhost/api/paddle/downgrades", {
        headers: authorization ? { authorization } : {},
      }),
    );

  beforeEach(() => vi.stubEnv("CRON_SECRET", "cron-secret"));

  it("needs the cron secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(mocks.due).not.toHaveBeenCalled();
  });

  it("switches due subscriptions without billing them", async () => {
    mocks.due.mockResolvedValue([
      { id: "sub_1", pendingPriceId: starter!.priceId.month },
    ]);
    const response = await call("Bearer cron-secret");
    expect(await response.json()).toEqual({ applied: 1, failed: 0 });
    expect(mocks.update).toHaveBeenCalledWith("sub_1", {
      items: [{ priceId: starter!.priceId.month, quantity: 1 }],
      prorationBillingMode: "do_not_bill",
    });
    const cutoff = mocks.due.mock.calls[0]![0] as Date;
    expect(cutoff.getTime()).toBeGreaterThan(Date.now());
  });

  it("reports failures so the scheduler retries", async () => {
    mocks.due.mockResolvedValue([
      { id: "sub_1", pendingPriceId: starter!.priceId.month },
    ]);
    mocks.update.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await call("Bearer cron-secret");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ applied: 0, failed: 1 });
  });
});
