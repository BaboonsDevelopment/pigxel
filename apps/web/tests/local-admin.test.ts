import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ adminClient: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ id: "someone", app_metadata: {} }),
}));
vi.mock("@/lib/supabase/admin", async (load) => ({
  ...(await load<typeof import("@/lib/supabase/admin")>()),
  createAdminClient: mocks.adminClient,
}));

import { isLocalAdmin } from "@/features/assets/local-admin";
import {
  createAssetTag,
  moveAssetToFront,
  removeAsset,
  setAssetTags,
  setPackPremium,
  updatePack,
} from "@/features/assets/admin-actions";

const withKeys = () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "secret");
};

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.adminClient.mockReset();
});

describe("the local asset admin", () => {
  it("is only on a developer's machine with the server key", () => {
    withKeys();
    vi.stubEnv("NODE_ENV", "development");
    expect(isLocalAdmin()).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(isLocalAdmin()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(isLocalAdmin()).toBe(false);
  });

  it("refuses every change on the hosted site, before touching the database", async () => {
    withKeys();
    vi.stubEnv("NODE_ENV", "production");
    const results = await Promise.all([
      updatePack("dungeon-heroes", {
        name: "X",
        description: "",
        background: null,
      }),
      setPackPremium("dungeon-heroes", true),
      setAssetTags("chibi-vampire", ["hero"]),
      createAssetTag("Hero"),
      moveAssetToFront("chibi-vampire"),
      removeAsset("chibi-vampire"),
    ]);
    for (const result of results) expect(result.error).toMatch(/local admin/);
    expect(mocks.adminClient).not.toHaveBeenCalled();
  });
});
