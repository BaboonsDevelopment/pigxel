import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithUser } from "@test/render";

vi.mock("@/features/billing/actions", () => ({ startCheckout: vi.fn() }));

import { PricingPlans } from "@/features/billing/components/pricing-plans";
import { TIERS } from "@/features/billing/pricing";

const [starter, pro, advanced] = TIERS;

describe("the AI plan's token picker", () => {
  it("prices and describes the amount people pick", () => {
    renderWithUser(<PricingPlans heading={null} signedIn />);
    expect(screen.getByText("2,000 AI tokens every month")).toBeTruthy();
    fireEvent.change(screen.getByRole("slider"), { target: { value: "2" } });
    expect(screen.getByText("7,000 AI tokens every month")).toBeTruthy();
    expect(screen.getByText("Priority support")).toBeTruthy();
    expect(screen.getByText("$20")).toBeTruthy();
  });

  it("offers subscribers a plan change to another amount", () => {
    renderWithUser(
      <PricingPlans
        heading={null}
        signedIn
        currentProductId={pro!.productId.month}
      />,
    );
    expect(screen.getByText("Your plan")).toBeTruthy();
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });
    expect(
      screen.getByRole("link", { name: "Change plan" }).getAttribute("href"),
    ).toBe(`/settings/subscription?plan=${starter!.productId.month}`);
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
});
