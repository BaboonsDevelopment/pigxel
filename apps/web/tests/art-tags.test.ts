import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ART_TAGS,
  isArtTag,
  matchArtTags,
  MAX_ART_TAGS,
} from "@/features/explore/art-tags";
import { parseExploreParams } from "@/features/explore/filters";
import { searchMatch } from "@/features/tiles/search";

const MIGRATIONS = join(__dirname, "../../../supabase/migrations");

/** Every tag the migrations put in public.art_tags. */
function databaseTags() {
  const tags = new Set<string>();
  for (const file of readdirSync(MIGRATIONS).sort()) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    const insert = sql.match(
      /insert into public\.art_tags \(id\) values([\s\S]*?);/,
    );
    for (const [, tag] of insert?.[1]?.matchAll(/\('([^']+)'\)/g) ?? [])
      tags.add(tag!);
  }
  return tags;
}

describe("art tags", () => {
  it("are lowercase words joined by hyphens, each once", () => {
    for (const tag of ART_TAGS) expect(tag).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(new Set(ART_TAGS).size).toBe(ART_TAGS.length);
    expect(ART_TAGS.length).toBeGreaterThan(1000);
  });

  it("are exactly the ones the database accepts", () => {
    expect([...databaseTags()].sort()).toEqual([...ART_TAGS].sort());
  });

  it("allow up to ten per art", () => {
    expect(MAX_ART_TAGS).toBe(10);
  });

  it("suggest tags starting with what was typed first", () => {
    expect(matchArtTags("sci")[0]).toBe("sci-fi");
    expect(matchArtTags("#Cat")[0]).toBe("cat");
    expect(matchArtTags("pixel art")).toContain("pixel-art");
    expect(matchArtTags("cat", ["cat"])).not.toContain("cat");
    expect(matchArtTags("e", [], 5)).toHaveLength(5);
    expect(matchArtTags("   ")).toEqual([]);
  });

  it("know which words are tags", () => {
    expect(isArtTag("house")).toBe(true);
    expect(isArtTag("House")).toBe(false);
    expect(isArtTag("not-a-real-tag")).toBe(false);
    expect(isArtTag(7)).toBe(false);
  });
});

describe("tags in Explore links", () => {
  it("keeps known tags, lowercased, without repeats", () => {
    const { tags } = parseExploreParams(
      { tag: "Fantasy,house,nope,house" },
      false,
    );
    expect(tags).toEqual(["fantasy", "house"]);
  });
});

describe("searching projects by tag", () => {
  it("only adds tags starting with the term, a few at most", () => {
    const filter = searchMatch("a")!;
    const tags = filter.match(/tags\.ov\.\{([^}]*)\}/)?.[1]?.split(",") ?? [];
    expect(tags.length).toBeLessThanOrEqual(20);
    expect(tags.every((tag) => tag.startsWith("a"))).toBe(true);
  });
});
