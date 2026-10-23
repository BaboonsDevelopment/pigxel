import { beforeEach, describe, expect, it, vi } from "vitest";
import { stubSupabaseEnv, supabase } from "@test/supabase";

vi.mock(
  "@/lib/supabase/admin",
  async () => (await import("@test/supabase")).supabaseModules.admin,
);

import {
  createPack,
  deletePack,
  moveAssets,
  productionCatalog,
  tagAssets,
  updatePack,
} from "@/features/asset-review/production";
import { ReviewError } from "@/features/asset-review/server";

beforeEach(stubSupabaseEnv);

const storageOps = (bucket: string) =>
  supabase
    .callsTo(`storage:${bucket}`)
    .map((call) => (call.kind === "storage" ? [call.op, ...call.args] : []));

describe("managing assets in production", () => {
  it("reads every asset, past the API's 1000-row cap", async () => {
    const rows = Array.from({ length: 1200 }, (_, i) => ({
      id: `a${i}`,
      name: `A${i}`,
      pack_id: i < 1100 ? "early" : "late",
      kind: "sprite",
      width: 64,
      height: 64,
      frame_count: 1,
      frame_ms: 100,
      premium: false,
      sheet_path: `a${i}/sheet.png`,
      asset_tag_links: [],
    }));
    supabase.respond("asset_packs", { data: [] });
    supabase.respond("asset_tags", { data: [] });
    supabase.respond("assets", (call) => {
      const [, from, to] =
        call.kind === "query" ? call.filters.find(([m]) => m === "range")! : [];
      return { data: rows.slice(from as number, (to as number) + 1) };
    });
    const { assets } = await productionCatalog();
    expect(assets).toHaveLength(1200);
    expect(assets.filter((a) => a.packId === "late")).toHaveLength(100);
    expect(supabase.callsTo("assets")).toHaveLength(3);
  });

  it("adds a pack after the last one, its id taken from its name", async () => {
    supabase.respond("asset_packs.select", { data: [{ sort: 7 }] });
    const pack = await createPack({ name: "  Crystal Caverns " });
    expect(pack).toMatchObject({ id: "crystal-caverns", premium: false });
    expect(supabase.callsTo("asset_packs.insert")[0]).toMatchObject({
      values: { id: "crystal-caverns", name: "Crystal Caverns", sort: 8 },
    });
  });

  it("says when a pack with that id already exists", async () => {
    supabase.respond("asset_packs.select", { data: [] });
    supabase.respond("asset_packs.insert", {
      error: { code: "23505", message: "duplicate key" },
    });
    await expect(createPack({ name: "Dungeon Heroes" })).rejects.toThrow(
      /already a pack called “dungeon-heroes”/,
    );
  });

  it("moves assets into a premium pack with their files, and keeps updated_at", async () => {
    supabase.respond("asset_packs", { data: { premium: true } });
    supabase.respondOnce("assets.select", { data: [{ sort: 4 }] });
    supabase.respondOnce("assets.select", {
      data: [
        {
          id: "bat",
          file_path: "bat/a.pigxel",
          premium: false,
          pack_id: "mobs",
        },
        {
          id: "orb",
          file_path: "orb/b.pigxel",
          premium: true,
          pack_id: "vault",
        },
        {
          id: "rat",
          file_path: "rat/c.pigxel",
          premium: true,
          pack_id: "vault",
        },
      ],
    });
    await moveAssets(["bat", "orb", "rat"], "vault");

    // Only the free asset's file changes bucket; ones already there stay put.
    expect(storageOps("assets")).toEqual([
      [
        "move",
        "bat/a.pigxel",
        "bat/a.pigxel",
        { destinationBucket: "premium-assets" },
      ],
    ]);
    const updates = supabase.callsTo("assets.update");
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      values: { pack_id: "vault", sort: 5, premium: true },
      filters: [["eq", "id", "bat"]],
    });
    expect(updates[0]).not.toHaveProperty("values.updated_at");
  });

  it("carries on when an earlier try already moved the file", async () => {
    supabase.respond("asset_packs", { data: { premium: false } });
    supabase.respondOnce("assets.select", { data: [] });
    supabase.respondOnce("assets.select", {
      data: [
        {
          id: "orb",
          file_path: "orb/b.pigxel",
          premium: true,
          pack_id: "vault",
        },
      ],
    });
    supabase.respond("storage:premium-assets.move", {
      error: { message: "not found" },
    });
    supabase.respond("storage:assets.list", { data: [{ name: "b.pigxel" }] });
    await moveAssets(["orb"], "props");
    expect(supabase.callsTo("assets.update")[0]).toMatchObject({
      values: { pack_id: "props", sort: 0, premium: false },
    });
  });

  it("stops before saving the row when the file couldn't move", async () => {
    supabase.respond("asset_packs", { data: { premium: true } });
    supabase.respondOnce("assets.select", { data: [] });
    supabase.respondOnce("assets.select", {
      data: [
        {
          id: "bat",
          file_path: "bat/a.pigxel",
          premium: false,
          pack_id: "mobs",
        },
      ],
    });
    supabase.respond("storage:assets.move", { error: { message: "boom" } });
    await expect(moveAssets(["bat"], "vault")).rejects.toThrow(/Try again/);
    expect(supabase.callsTo("assets.update")).toEqual([]);
  });

  it("refuses bad ids before touching the database", async () => {
    await expect(moveAssets([], "vault")).rejects.toBeInstanceOf(ReviewError);
    await expect(moveAssets(["../x"], "vault")).rejects.toBeInstanceOf(
      ReviewError,
    );
    await expect(moveAssets(["bat"], "Vault!")).rejects.toBeInstanceOf(
      ReviewError,
    );
    await expect(tagAssets(["bat"], { add: ["a b"] })).rejects.toBeInstanceOf(
      ReviewError,
    );
    expect(supabase.callsTo("assets")).toEqual([]);
    expect(supabase.callsTo("asset_tag_links")).toEqual([]);
  });

  it("tags a selection, and adding wins over removing the same tag", async () => {
    await tagAssets(["bat", "orb"], {
      add: ["undead"],
      remove: ["undead", "cute"],
    });
    expect(supabase.callsTo("asset_tag_links.delete")[0]).toMatchObject({
      filters: [
        ["in", "asset_id", ["bat", "orb"]],
        ["in", "tag_id", ["cute"]],
      ],
    });
    expect(supabase.callsTo("asset_tag_links.upsert")[0]).toMatchObject({
      values: [
        { asset_id: "bat", tag_id: "undead" },
        { asset_id: "orb", tag_id: "undead" },
      ],
    });
  });

  it("only deletes a pack once it's empty", async () => {
    supabase.respond("assets", { data: [], count: 2 });
    await expect(deletePack("vault")).rejects.toThrow(/Move its assets out/);
    expect(supabase.callsTo("asset_packs.delete")).toEqual([]);
  });

  it("moves every file before making a pack premium", async () => {
    supabase.respond("assets", {
      data: [
        { id: "bat", file_path: "bat/a.pigxel", premium: false },
        { id: "orb", file_path: "orb/b.pigxel", premium: true },
      ],
    });
    supabase.respond("asset_packs.update", { data: [{ id: "vault" }] });
    await updatePack("vault", { premium: true });
    expect(storageOps("assets").map(([op, path]) => [op, path])).toEqual([
      ["move", "bat/a.pigxel"],
    ]);
    expect(supabase.callsTo("asset_packs.update")[0]).toMatchObject({
      values: { premium: true },
      filters: [["eq", "id", "vault"]],
    });
  });

  it("stamps a pin and clears it", async () => {
    supabase.respond("asset_packs.update", { data: [{ id: "vault" }] });
    await updatePack("vault", { pinned: true });
    expect(supabase.callsTo("asset_packs.update")[0]).toMatchObject({
      values: { pinned_at: expect.stringMatching(/^\d{4}-\d\d-\d\dT/) },
      filters: [["eq", "id", "vault"]],
    });
    expect(supabase.callsTo("assets")).toEqual([]);
    await updatePack("vault", { pinned: false });
    expect(supabase.callsTo("asset_packs.update")[1]).toMatchObject({
      values: { pinned_at: null },
      filters: [["eq", "id", "vault"]],
    });
  });

  it("keeps sizes out of pack names", async () => {
    supabase.respond("asset_packs.update", { data: [{ id: "vault" }] });
    await updatePack("vault", { name: "Vault · 64×64" });
    expect(supabase.callsTo("asset_packs.update")[0]).toMatchObject({
      values: { name: "Vault" },
    });
    await expect(updatePack("vault", { name: "64×64" })).rejects.toThrow(
      /Give the pack a name/,
    );
  });

  it("rejects a pin that isn't true or false", async () => {
    await expect(updatePack("vault", { pinned: "yes" })).rejects.toThrow(
      /pinned must be/,
    );
    expect(supabase.callsTo("asset_packs")).toEqual([]);
  });

  it("rejects a colour outside the palette", async () => {
    await expect(
      updatePack("vault", { background: "#ff0000" }),
    ).rejects.toThrow(/background colours/);
    expect(supabase.callsTo("asset_packs")).toEqual([]);
  });
});
