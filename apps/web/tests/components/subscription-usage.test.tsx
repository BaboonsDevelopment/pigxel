import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithUser } from "@test/render";
import { SubscriptionUsage } from "@/features/billing/components/subscription-usage";
import { SubscriptionSupport } from "@/features/billing/components/subscription-support";
import type { CurrentPlan } from "@/features/billing/subscription";

describe("subscription usage overview", () => {
  it("shows an Artist's cloud allowance and explains that AI is not included", () => {
    renderWithUser(
      <SubscriptionUsage
        plan="Artist"
        usage={{
          cloudProjects: 12,
          ai: { limit: 0, spent: 0, left: 0, resetsAt: null },
        }}
      />,
    );
    expect(screen.getByText(/63 projects remaining/)).toBeTruthy();
    expect(screen.getByText(/doesn’t include AI tools/)).toBeTruthy();
    expect(screen.getByText("Not included")).toBeVisible();
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
  });
  it("explains over-limit usage without suggesting existing work was deleted", () => {
    renderWithUser(
      <SubscriptionUsage plan="Free" usage={{ cloudProjects: 12, ai: null }} />,
    );
    expect(screen.getByText(/existing work is safe/)).toBeTruthy();
    expect(screen.getByText(/doesn’t include AI tools/)).toBeTruthy();
    expect(
      screen.queryByText(/Couldn’t load your AI usage/),
    ).not.toBeInTheDocument();
  });
  it("labels unknown usage instead of rendering an empty meter", () => {
    renderWithUser(
      <SubscriptionUsage
        plan="Pro"
        usage={{ cloudProjects: null, ai: null }}
      />,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText(/Couldn’t load your cloud usage/)).toBeTruthy();
  });
  it("routes Advanced support with account and subscription context", () => {
    renderWithUser(
      <SubscriptionSupport
        email="artist@example.com"
        plan={
          { name: "Advanced", subscriptionId: "sub_example" } as CurrentPlan
        }
      />,
    );
    const href = screen
      .getByRole("link", { name: "Contact priority support" })
      .getAttribute("href")!;
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("subject")).toContain("[Priority]");
    expect(params.get("body")).toContain("sub_example");
    expect(params.get("body")).toContain("artist@example.com");
  });
});
