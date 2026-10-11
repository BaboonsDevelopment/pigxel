import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirectTo } from "@test/next";
import { aUser, stubSupabaseEnv, supabase } from "@test/supabase";

vi.mock(
  "@/lib/supabase/server",
  async () => (await import("@test/supabase")).supabaseModules.server,
);
vi.mock(
  "next/navigation",
  async () => (await import("@test/next")).navigationModule,
);

import { reportComment } from "@/features/explore/actions";

const COMMENT = "3f9c1e0a-7a52-4c38-9a8e-2f0b6f8d1c44";

beforeEach(stubSupabaseEnv);

describe("reporting a comment", () => {
  it("asks guests to log in first", async () => {
    await expect(reportComment(COMMENT)).rejects.toThrow(redirectTo("/login"));
    expect(supabase.callsTo("comment_reports")).toEqual([]);
  });

  it("files the report under the signed-in person", async () => {
    supabase.signIn(aUser());
    expect(await reportComment(COMMENT)).toEqual({});
    // The database fills in the reporter; the app must not send one.
    expect(supabase.callsTo("comment_reports.insert")[0]).toMatchObject({
      values: { comment_id: COMMENT },
    });
  });

  it("treats a repeated report as done", async () => {
    supabase.signIn(aUser());
    supabase.respond("comment_reports.insert", {
      error: { code: "23505", message: "duplicate key value" },
    });
    expect(await reportComment(COMMENT)).toEqual({});
  });

  it("says so when the report can't be saved", async () => {
    supabase.signIn(aUser());
    supabase.respond("comment_reports.insert", {
      error: { code: "42501", message: "denied" },
    });
    expect(await reportComment(COMMENT)).toEqual({
      error: "Couldn’t report that. Try again.",
    });
  });

  it("rejects malformed ids without touching the database", async () => {
    supabase.signIn(aUser());
    expect(await reportComment("not-a-uuid")).toEqual({
      error: "Invalid request.",
    });
    expect(supabase.callsTo("comment_reports")).toEqual([]);
  });
});
