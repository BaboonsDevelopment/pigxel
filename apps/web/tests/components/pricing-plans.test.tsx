import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithUser } from "@test/render";

const { previewPlanChange, changePlan } = vi.hoisted(() => ({
  changePlan: vi.fn<(productId: string) => Promise<void>>(async () => {}),
  previewPlanChange: vi.fn(async (productId: string) => ({
    change: "upgrade" as const,
    productId,
  })),
}));

vi.mock("@/features/billing/actions", () => ({
  startCheckout: vi.fn(),
  previewPlanChange,
  changePlan,
}));

// jsdom has no modal dialogs.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};

/** Clicks "Change plan" and returns the plan the dialog asked about. */
async function changeTo(button: HTMLElement) {
  previewPlanChange.mockClear();
  fireEvent.click(button);
  await waitFor(() => expect(previewPlanChange).toHaveBeenCalledTimes(1));
  return previewPlanChange.mock.calls[0]![0];
}

const changeButtons = () =>
  screen.getAllByRole("button", { name: "Change plan" });

import { PricingPlans } from "@/features/billing/components/pricing-plans";
import { ARTIST_PLAN, TIERS } from "@/features/billing/pricing";

const [starter, pro, advanced] = TIERS;

describe("the AI plan's token picker", () => {
  it("enables local test checkout for Artist and Pro", () => {
    renderWithUser(<PricingPlans heading={null} signedIn billingMode="test" />);
    expect(screen.queryByText("Coming soon")).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Subscribe to Artist, billed monthly",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Subscribe to Pro, billed monthly" }),
    ).toBeTruthy();
  });

  it("uses live products for plan changes and enables Artist in live mode", async () => {
    renderWithUser(
      <PricingPlans
        heading={null}
        signedIn
        billingMode="live"
        currentProductId={pro!.liveProductId.month}
      />,
    );
    expect(screen.getByText("Your plan")).toBeTruthy();
    expect(screen.queryByText("Coming soon")).toBeNull();
    expect(await changeTo(changeButtons()[0]!)).toBe(
      ARTIST_PLAN.liveProductId.month,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "2" } });
    expect(await changeTo(changeButtons()[1]!)).toBe(
      advanced!.liveProductId.month,
    );
    expect(
      await screen.findByText(/Switch to Advanced, billed monthly?/),
    ).toBeTruthy();
  });

  it("shows Artist subscribers their plan without selecting a Pro token level", async () => {
    renderWithUser(
      <PricingPlans
        heading={null}
        signedIn
        billingMode="live"
        currentProductId={ARTIST_PLAN.liveProductId.year}
      />,
    );
    expect(screen.getByText("Your plan")).toBeTruthy();
    expect(await changeTo(changeButtons()[0]!)).toBe(pro!.liveProductId.year);
  });

  it("prices and describes the amount people pick", () => {
    renderWithUser(<PricingPlans heading={null} signedIn />);
    expect(screen.getByText("2,000 AI tokens every month")).toBeTruthy();
    fireEvent.change(screen.getByRole("slider"), { target: { value: "2" } });
    expect(screen.getByText("7,000 AI tokens every month")).toBeTruthy();
    expect(screen.getByText("Priority support")).toBeTruthy();
    expect(screen.getByText("$20")).toBeTruthy();
  });

  it("offers subscribers a plan change to another amount", async () => {
    renderWithUser(
      <PricingPlans
        heading={null}
        signedIn
        currentProductId={pro!.productId.month}
      />,
    );
    expect(screen.getByText("Your plan")).toBeTruthy();
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });
    expect(await changeTo(changeButtons().at(-1)!)).toBe(
      starter!.productId.month,
    );
  });

  it("opens on the subscriber's own amount and billing period", () => {
    renderWithUser(
      <PricingPlans
        heading={null}
        signedIn
        currentProductId={advanced!.productId.year}
      />,
    );
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("2");
    expect(screen.getByText("Your plan")).toBeTruthy();
  });

  it("shows the real yearly price against twelve monthly payments", async () => {
    const { user } = renderWithUser(<PricingPlans heading={null} />);
    await user.click(screen.getByRole("button", { name: /Yearly/ }));
    // Pro: $75 a year, against 12 × $10.
    expect(screen.getAllByText("$75").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$120").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/ year").length).toBeGreaterThan(0);
  });

  it("confirms a plan change in place and charges the plan on file", async () => {
    renderWithUser(
      <PricingPlans
        heading={null}
        signedIn
        currentProductId={pro!.productId.month}
      />,
    );
    fireEvent.change(screen.getByRole("slider"), { target: { value: "2" } });
    await changeTo(changeButtons().at(-1)!);
    fireEvent.click(
      await screen.findByRole("button", { name: "Upgrade and pay" }),
    );
    await waitFor(() =>
      expect(changePlan).toHaveBeenCalledWith(advanced!.productId.month),
    );
    expect(await screen.findByText("Plan changed")).toBeTruthy();
  });
});
