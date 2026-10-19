import { beforeEach, expect, it, vi } from "vitest";
import { supabase } from "@test/supabase";
vi.mock(
  "@/lib/supabase/server",
  async () => (await import("@test/supabase")).supabaseModules.server,
);
import { listProfileBadges } from "@/features/membership/server";
const badge = {
  id: "badge",
  label: "Pixel star",
  visible: true,
  sender: null,
  art: null,
};
beforeEach(() => {
  supabase.respond("profile_badges", { data: [badge] });
});
it("never queries private messages for the public profile", async () => {
  expect(await listProfileBadges("recipient")).toEqual([
    { ...badge, message: "" },
  ]);
  expect(supabase.callsTo("rpc:received_badge_messages")).toHaveLength(0);
  expect(supabase.callsTo("profile_badges")[0]).toMatchObject({
    columns: expect.not.stringContaining("message"),
  });
});
it("merges only messages returned by the recipient-authorized function", async () => {
  supabase.respond("rpc:received_badge_messages", {
    data: [{ id: "badge", message: "Just for you" }],
  });
  expect(await listProfileBadges("recipient", true)).toEqual([
    { ...badge, message: "Just for you" },
  ]);
  expect(supabase.callsTo("rpc:received_badge_messages")).toHaveLength(1);
});
it("shows a failure rather than silently omitting private messages on database errors", async () => {
  supabase.respond("rpc:received_badge_messages", {
    error: { message: "unavailable" },
  });
  await expect(listProfileBadges("recipient", true)).rejects.toThrow(
    "Couldn’t load badge messages",
  );
});
