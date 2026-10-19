import { describe, expect, it, vi } from "vitest";
import { supabase } from "@test/supabase";
const mocks = vi.hoisted(() => ({ balance: vi.fn() }));
vi.mock(
  "@/lib/supabase/server",
  async () => (await import("@test/supabase")).supabaseModules.server,
);
vi.mock("@/features/ai/credits", () => ({ creditBalance: mocks.balance }));
import { getSubscriptionUsage } from "@/features/billing/usage";

describe("subscription usage", () => {
  it("counts only the account's non-trashed projects and uses existing AI metering", async () => {
    supabase.respond("tiles", { count: 12 });
    mocks.balance.mockResolvedValue({
      limit: 2000,
      spent: 400,
      left: 1600,
      resetsAt: "2026-11-01T00:00:00Z",
    });
    expect(await getSubscriptionUsage("member")).toMatchObject({
      cloudProjects: 12,
      ai: { left: 1600 },
    });
    expect(supabase.callsTo("tiles")[0]).toMatchObject({
      filters: expect.arrayContaining([
        ["eq", "user_id", "member"],
        ["is", "deleted_at", null],
      ]),
    });
  });
  it("keeps failed usage unknown instead of displaying zero", async () => {
    supabase.respond("tiles", { error: { message: "down" } });
    mocks.balance.mockRejectedValue(new Error("down"));
    expect(await getSubscriptionUsage("member")).toEqual({
      cloudProjects: null,
      ai: null,
    });
  });
});
