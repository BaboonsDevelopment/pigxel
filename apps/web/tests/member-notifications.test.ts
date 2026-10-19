import { describe, expect, it, vi } from "vitest";
import { supabase } from "@test/supabase";
vi.mock(
  "@/lib/supabase/server",
  async () => (await import("@test/supabase")).supabaseModules.server,
);
import { listNotifications } from "@/features/notifications/server";

describe("member notifications", () => {
  it("keeps feedback and badge notifications even without an actor profile", async () => {
    supabase.respond("profiles", {
      data: [{ notifications_seen_at: "2026-10-01T00:00:00Z" }],
    });
    supabase.respond("notifications", {
      data: [
        {
          id: "feedback",
          kind: "feedback_status",
          tile_name: "My report",
          feedback_id: 42,
          detail: "implemented",
          created_at: "2026-10-19T12:00:00Z",
          actor: null,
        },
        {
          id: "badge",
          kind: "badge_gift",
          tile_name: "Pixel star",
          created_at: "2026-10-19T11:00:00Z",
          actor: null,
        },
      ],
    });
    const items = await listNotifications("member");
    expect(items).toEqual([
      expect.objectContaining({
        kind: "feedback_status",
        feedbackId: 42,
        status: "implemented",
        title: "My report",
        unread: true,
      }),
      expect.objectContaining({
        kind: "badge_gift",
        label: "Pixel star",
        unread: true,
      }),
    ]);
  });
});
