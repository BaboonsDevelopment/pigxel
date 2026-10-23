import { beforeEach, describe, expect, it, vi } from "vitest";
import { stubSupabaseEnv, supabase } from "@test/supabase";
import { loadPacks, type PackSource } from "../scripts/assets/lib/source";
import { readReviews } from "../scripts/assets/lib/review";
import { reviewSnapshot } from "@/features/asset-review/server";

vi.mock("@/lib/supabase/admin", async () => (await import("@test/supabase")).supabaseModules.admin);
vi.mock("../scripts/assets/lib/source.ts", async (original) => ({
  ...await original<typeof import("../scripts/assets/lib/source")>(),
  loadPacks: vi.fn(),
}));
vi.mock("../scripts/assets/lib/review.ts", async (original) => ({
  ...await original<typeof import("../scripts/assets/lib/review")>(),
  readReviews: vi.fn(),
}));

const published = Array.from({ length: 1205 }, (_, i) => ({
  id: `asset-${String(i).padStart(4, "0")}`, updated_at: "2026-10-23T10:00:00Z",
}));
const pack: PackSource = {
  id: "test", name: "Test", tier: "free", block: null, background: null,
  premium: [], description: "", palette: [], palettes: [], style: { maxColors: 16 }, issues: [],
  assets: published.map(({ id }) => ({ id, key: `test/${id}`, pack: "test", hash: "original", file: "", def: null, issues: [] })),
};

beforeEach(() => {
  stubSupabaseEnv();
  vi.mocked(loadPacks).mockReturnValue([pack]);
  vi.mocked(readReviews).mockReturnValue({});
  supabase.respond("assets", (call) => {
    if (call.kind !== "query") return { data: [] };
    const range = call.filters.find(([method]) => method === "range");
    return { data: published.slice(Number(range?.[1] ?? 0), Number(range?.[2] ?? 999) + 1) };
  });
});

describe("production-aware asset review", () => {
  it("excludes all published art across more than 1000 database rows", async () => {
    const result = await reviewSnapshot();
    expect(result.blocks[0]!.tiles).toEqual([]);
    expect(supabase.callsTo("assets")).toHaveLength(3);
    for (const call of supabase.callsTo("assets"))
      if (call.kind === "query") expect(call.filters).toContainEqual(["order", "id"]);
  });
  it("rejects a failed production read instead of resurfacing every local asset", async () => {
    supabase.respondOnce("assets", { data: published.slice(0, 500) });
    supabase.respondOnce("assets", { error: { message: "connection limit" } });
    await expect(reviewSnapshot()).rejects.toMatchObject({ status: 503 });
  });
  it("still shows a genuinely changed local replacement", async () => {
    vi.mocked(readReviews).mockReturnValue({
      "test/asset-1204": { status: "approved", hash: "older-version", at: "2026-10-22T10:00:00Z", note: "" },
    });
    const result = await reviewSnapshot();
    expect(result.blocks[0]!.tiles.map((tile) => tile.id)).toEqual(["asset-1204"]);
    expect(result.blocks[0]!.tiles[0]!.state).toBe("changed");
  });
});
