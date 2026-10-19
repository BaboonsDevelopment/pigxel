import { beforeEach, describe, expect, it, vi } from "vitest";
import { aUser, supabase } from "@test/supabase";
import {
  readBadge,
  readHiring,
  readPortfolio,
} from "@/features/membership/validation";
import { youtubeIdFrom } from "@/features/tutorials/video";
import { safeNext } from "@/lib/auth/routes";

const mocks = vi.hoisted(() => ({ plan: vi.fn() }));
vi.mock(
  "@/lib/supabase/server",
  async () => (await import("@test/supabase")).supabaseModules.server,
);
vi.mock("@/lib/auth/session", async () => ({
  requireUser: async () => (await import("@test/supabase")).supabase.user,
  isAdmin: (user: { app_metadata: { role?: string } }) =>
    user.app_metadata.role === "admin",
}));
vi.mock("@/features/billing/server", () => ({ getCurrentPlan: mocks.plan }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), refresh: vi.fn() }));

import {
  addPortfolioItem,
  giftBadge,
  saveHiringProfile,
  setBadgeVisible,
} from "@/features/membership/actions";
import { updateFeedbackStatus } from "@/features/feedback/actions";
import { saveTutorialVideo } from "@/features/tutorials/actions";

const ID = "16e21887-066d-485c-a2d0-38e1e90a3aff";
const form = (values: Record<string, string>) => {
  const result = new FormData();
  for (const [name, value] of Object.entries(values)) result.set(name, value);
  return result;
};

beforeEach(() => {
  supabase.signIn(aUser({ id: "member" }));
  mocks.plan.mockResolvedValue({ name: "Artist" });
});

describe("member perk access", () => {
  it("refuses gifting and portfolio writes without a paid plan", async () => {
    mocks.plan.mockResolvedValue({ name: "Free" });
    expect(await giftBadge({}, form({}))).toHaveProperty("error");
    expect(await saveHiringProfile({}, form({}))).toHaveProperty("error");
    expect(await addPortfolioItem({}, form({}))).toHaveProperty("error");
    expect(supabase.callsTo("rpc:gift_profile_badge")).toHaveLength(0);
    expect(supabase.callsTo("hiring_profiles")).toHaveLength(0);
  });

  it("uses a validated username and artwork, with entitlement enforced by the gifting RPC", async () => {
    const result = await giftBadge(
      {},
      form({
        username: " @another_artist ",
        tileId: ID,
        label: " Pixel star ",
        message: "Thanks!",
      }),
    );
    expect(result).toHaveProperty("message");
    expect(supabase.callsTo("rpc:gift_profile_badge")[0]).toMatchObject({
      args: {
        p_username: "another_artist",
        p_tile_id: ID,
        p_label: "Pixel star",
        p_message: "Thanks!",
      },
    });
  });

  it("does not report a failed gift as sent", async () => {
    supabase.respond("rpc:gift_profile_badge", {
      error: { message: "blocked" },
    });
    expect(
      await giftBadge(
        {},
        form({ username: "another_artist", tileId: ID, label: "Star" }),
      ),
    ).toHaveProperty("error");
  });

  it("only changes display for a badge received by the signed-in user", async () => {
    supabase.respond("profile_badges.update", { data: [{ id: ID }] });
    expect(await setBadgeVisible(ID, true)).toEqual({});
    expect(supabase.callsTo("profile_badges.update")[0]).toMatchObject({
      values: { visible: true },
      filters: expect.arrayContaining([["eq", "recipient_id", "member"]]),
    });
  });

  it("refuses unknown badge IDs before querying the database", async () => {
    expect(await setBadgeVisible("bad", true)).toHaveProperty("error");
    expect(supabase.callsTo("profile_badges")).toHaveLength(0);
  });
});

describe("member input", () => {
  it("preserves the badge recipient after login without allowing an external return URL", () => {
    expect(safeNext("/settings/perks?gift=another_artist")).toBe(
      "/settings/perks?gift=another_artist",
    );
    expect(safeNext("/settings/perks?gift=https://evil.test")).toBe(
      "/settings/perks",
    );
    expect(safeNext("https://evil.test/settings/perks?gift=artist")).toBe(
      "/home",
    );
    expect(safeNext("/feedback/42")).toBe("/feedback/42");
  });
  it("rejects script links and oversized content", () => {
    expect(
      readHiring(
        form({ headline: "Artist", contactUrl: "javascript:alert(1)" }),
      ),
    ).toHaveProperty("error");
    expect(
      readPortfolio(
        form({ title: "Work", url: "https://example.com@evil.test/" }),
      ),
    ).toHaveProperty("error");
    expect(
      readBadge(
        form({ username: "artist", label: "x".repeat(33), tileId: ID }),
      ),
    ).toHaveProperty("error");
    expect(
      readPortfolio(
        form({ title: "Work", url: "https://example.com", tileId: "invalid" }),
      ),
    ).toHaveProperty("error");
  });
});

describe("team controls", () => {
  it("blocks non-admin feedback status and tutorial video changes", async () => {
    expect(await updateFeedbackStatus(1, "implemented")).toHaveProperty(
      "error",
    );
    expect(
      await saveTutorialVideo(
        "pixel-art-basics",
        {},
        form({ video: "dQw4w9WgXcQ" }),
      ),
    ).toHaveProperty("error");
    expect(supabase.callsTo("rpc:set_feedback_status")).toHaveLength(0);
    expect(supabase.callsTo("tutorial_videos")).toHaveLength(0);
  });

  it("validates feedback status names before invoking the admin RPC", async () => {
    supabase.signIn(aUser({ app_metadata: { role: "admin" } }));
    expect(await updateFeedbackStatus(1, "constructor")).toHaveProperty(
      "error",
    );
    expect(await updateFeedbackStatus(1, "implemented")).toEqual({});
    expect(supabase.callsTo("rpc:set_feedback_status")).toHaveLength(1);
  });

  it("stores only a video ID for an existing lesson, and can remove it", async () => {
    supabase.signIn(aUser({ app_metadata: { role: "admin" } }));
    expect(
      await saveTutorialVideo(
        "missing-lesson",
        {},
        form({ video: "dQw4w9WgXcQ" }),
      ),
    ).toHaveProperty("error");
    expect(
      await saveTutorialVideo(
        "pixel-art-basics",
        {},
        form({ video: "https://youtu.be/dQw4w9WgXcQ" }),
      ),
    ).toHaveProperty("message");
    expect(supabase.callsTo("tutorial_videos.upsert")[0]).toMatchObject({
      values: { slug: "pixel-art-basics", youtube_id: "dQw4w9WgXcQ" },
    });
    expect(
      await saveTutorialVideo("pixel-art-basics", {}, form({ video: "" })),
    ).toHaveProperty("message");
    expect(supabase.callsTo("tutorial_videos.delete")).toHaveLength(1);
  });
});

describe("lesson video URLs", () => {
  it("accepts IDs and supported YouTube URLs", () => {
    for (const value of [
      "dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/shorts/dQw4w9WgXcQ",
    ])
      expect(youtubeIdFrom(value)).toBe("dQw4w9WgXcQ");
  });
  it("rejects lookalike hosts, arbitrary embed URLs, and scripts", () => {
    for (const value of [
      "javascript:alert(1)",
      "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
      "https://evil.test/embed/dQw4w9WgXcQ",
      "https://youtube.com/watch?v=bad",
    ])
      expect(youtubeIdFrom(value)).toBeNull();
  });
});
