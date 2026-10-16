import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TIERS } from "@/features/billing/pricing";

const mocks = vi.hoisted(() => ({ user: vi.fn(), plan: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/features/billing/actions", () => ({ startCheckout: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getUser: mocks.user }));
vi.mock("@/features/billing/server", () => ({ getCurrentPlan: mocks.plan }));

import { PricingPlans } from "@/features/billing/components/pricing-plans";
import Welcome from "@/app/(app)/welcome/page";

const pro = TIERS.find((tier) => tier.name === "Pro")!;

const pricing = (props: Partial<Parameters<typeof PricingPlans>[0]>) =>
  renderToStaticMarkup(
    createElement(PricingPlans, { heading: null, ...props }),
  );

beforeEach(() => vi.resetAllMocks());

describe("pricing for subscribers", () => {
  it("shows prices and limits without JavaScript", () => {
    const html = pricing({});
    expect(html).toContain("$10.00");
    expect(html).toContain("2,000 AI tokens every month");
    expect(html).toContain("Premium assets and tutorials");
    expect(html).toContain("5 arts in Pigxel cloud");
    expect(html).not.toContain("AI tokens to try");
    expect(html).toContain("100 arts in Pigxel cloud");
    expect(html).toContain("plus tax");
  });

  it("asks guests to sign up before paying", () => {
    const html = pricing({});
    expect(html).toContain("Sign up to subscribe");
    expect(html).not.toContain(">Subscribe<");
  });

  it("lets accounts subscribe", () => {
    expect(pricing({ signedIn: true })).toContain(">Subscribe<");
  });

  it("offers plan changes instead of a second subscription", () => {
    const html = pricing({
      signedIn: true,
      currentProductId: pro.productId.month,
    });
    expect(html).toContain("Your plan");
    expect(html).toContain("Change plan");
    expect(html).toContain(
      `/settings/subscription?plan=${TIERS[0]!.productId.month}`,
    );
    expect(html).not.toContain(">Subscribe<");
  });
});

describe("welcome page", () => {
  const render = async () => renderToStaticMarkup(await Welcome());

  it("confirms an active plan", async () => {
    mocks.user.mockResolvedValue({ id: "user-1" });
    mocks.plan.mockResolvedValue({ name: "Pro" });
    const html = await render();
    expect(html).toContain("Welcome to Pro");
    expect(html).toContain("Your plan is active");
  });

  it("waits for Creem instead of claiming the payment went through", async () => {
    mocks.user.mockResolvedValue({ id: "user-1" });
    mocks.plan.mockResolvedValue({ name: "Free" });
    const html = await render();
    expect(html).toContain("Finishing your subscription");
    expect(html).not.toContain("payment went through");
  });

  it("asks guests to log in", async () => {
    mocks.user.mockResolvedValue(null);
    expect(await render()).toContain("Log in to see your plan");
    expect(mocks.plan).not.toHaveBeenCalled();
  });
});
