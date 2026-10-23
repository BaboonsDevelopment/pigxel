import { describe, expect, it } from "vitest";
import {
  assetViewUrl,
  cleanFilters,
  filterPacks,
  NO_ASSET_FILTERS,
  packViewUrl,
  relatedPacks,
  readAssetView,
  type PackFacts,
} from "@/features/assets/filters";

const pack = (id: string, facts: Partial<PackFacts> = {}): PackFacts => ({
  id,
  name: id.replace(/-/g, " "),
  description: null,
  premium: false,
  tags: [],
  longestSide: 64,
  animated: 0,
  count: 10,
  uses: 0,
  createdAt: "2026-10-01T00:00:00Z",
  pinnedAt: null,
  ...facts,
});

const packs = [
  pack("dungeon-heroes", { tags: ["hero", "fantasy"], animated: 10, uses: 5 }),
  pack("food-dishes", { tags: ["food"], premium: true, uses: 9 }),
  pack("haunted-october", {
    tags: ["holiday", "fantasy"],
    longestSide: 128,
    animated: 3,
    createdAt: "2026-10-15T00:00:00Z",
  }),
];
const none = {
  favourites: new Set<string>(),
  tagNames: new Map([["food", "Food"]]),
};
const ids = (filters: Partial<typeof NO_ASSET_FILTERS>, context = none) =>
  filterPacks(packs, { ...NO_ASSET_FILTERS, ...filters }, context).map(
    (p) => p.id,
  );

describe("the Assets page address", () => {
  it("round-trips a view and leaves defaults out", () => {
    const filters = {
      ...NO_ASSET_FILTERS,
      query: "slime",
      tags: ["fantasy", "hero"],
      size: "64" as const,
      access: "premium" as const,
      pack: "dungeon-heroes",
      favourites: true,
      sort: "popular" as const,
    };
    const url = assetViewUrl("all", filters, "chibi-vampire");
    const params = Object.fromEntries(new URL(url, "http://x").searchParams);
    expect(readAssetView(params)).toEqual({
      tab: "all",
      filters,
      asset: "chibi-vampire",
    });
    expect(assetViewUrl("packs", NO_ASSET_FILTERS)).toBe("/assets");
  });

  it("drops anything it doesn't know", () => {
    const view = readAssetView({
      tab: "nope",
      size: "999",
      sort: "random",
      tags: "ok,Bad Tag,also-ok",
      pack: "../../etc",
      asset: "<script>",
    });
    expect(view.tab).toBe("packs");
    expect(view.filters).toMatchObject({
      size: "any",
      sort: "newest",
      tags: ["ok", "also-ok"],
      pack: null,
    });
    expect(view.asset).toBeNull();
    expect(
      cleanFilters({ ...NO_ASSET_FILTERS, pack: "Robert'); drop" }).pack,
    ).toBeNull();
  });
});

describe("filtering packs", () => {
  it("accepts a hashtag in the browse search", () => {
    expect(ids({ query: "#food" })).toEqual(["food-dishes"]);
  });
  it("shows the newest first by default", () => {
    expect(ids({})).toEqual([
      "haunted-october",
      "dungeon-heroes",
      "food-dishes",
    ]);
  });

  it("sorts by popularity and name", () => {
    expect(ids({ sort: "popular" })).toEqual([
      "food-dishes",
      "dungeon-heroes",
      "haunted-october",
    ]);
    expect(ids({ sort: "za" })[0]).toBe("haunted-october");
  });

  it("needs every chosen tag, and matches tag names in search", () => {
    expect(ids({ tags: ["fantasy"] })).toEqual([
      "haunted-october",
      "dungeon-heroes",
    ]);
    expect(ids({ tags: ["fantasy", "hero"] })).toEqual(["dungeon-heroes"]);
    expect(ids({ query: "FOOD" })).toEqual(["food-dishes"]);
  });

  it("filters by access, motion, size and favourites", () => {
    expect(ids({ access: "premium" })).toEqual(["food-dishes"]);
    expect(ids({ access: "free" })).not.toContain("food-dishes");
    expect(ids({ motion: "animated" })).toEqual([
      "haunted-october",
      "dungeon-heroes",
    ]);
    expect(ids({ motion: "still" })).toEqual([
      "haunted-october",
      "food-dishes",
    ]);
    expect(ids({ size: "128" })).toEqual(["haunted-october"]);
    expect(
      ids(
        { favourites: true },
        { ...none, favourites: new Set(["food-dishes"]) },
      ),
    ).toEqual(["food-dishes"]);
  });

  it("puts pinned packs first, the latest pin leading, under any sort", () => {
    const pinned = [
      ...packs,
      pack("zombie-town", { pinnedAt: "2026-10-20T00:00:00Z" }),
      pack("apple-farm", { pinnedAt: "2026-10-22T00:00:00Z" }),
    ];
    const order = (filters: Partial<typeof NO_ASSET_FILTERS>) =>
      filterPacks(pinned, { ...NO_ASSET_FILTERS, ...filters }, none).map(
        (p) => p.id,
      );
    expect(order({})).toEqual([
      "apple-farm",
      "zombie-town",
      "haunted-october",
      "dungeon-heroes",
      "food-dishes",
    ]);
    expect(order({ sort: "az" }).slice(0, 3)).toEqual([
      "apple-farm",
      "zombie-town",
      "dungeon-heroes",
    ]);
    expect(order({ query: "zombie" })).toEqual(["zombie-town"]);
  });
});

describe("a pack's page", () => {
  it("has an address that leaves the pack out of its filters", () => {
    expect(packViewUrl("dungeon-heroes")).toBe("/assets/packs/dungeon-heroes");
    expect(
      packViewUrl(
        "dungeon-heroes",
        { ...NO_ASSET_FILTERS, pack: "other", motion: "animated" },
        "chibi-vampire",
      ),
    ).toBe("/assets/packs/dungeon-heroes?motion=animated&asset=chibi-vampire");
  });

  it("suggests packs sharing tags, then size, never itself", () => {
    const [heroes, food, haunted] = packs;
    expect(relatedPacks(heroes!, packs).map((p) => p.id)).toEqual([
      "haunted-october",
      "food-dishes",
    ]);
    expect(relatedPacks(food!, packs).map((p) => p.id)).toEqual([
      "dungeon-heroes",
      "haunted-october",
    ]);
    expect(relatedPacks(haunted!, packs, 1).map((p) => p.id)).toEqual([
      "dungeon-heroes",
    ]);
  });
});
