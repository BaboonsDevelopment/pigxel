import { describe, expect, it, vi } from "vitest";
import {
  joinedLabel,
  toArtistProfile,
  type ProfileRow,
} from "@/lib/profile/profile";
import {
  linkTitle,
  normalizeUrl,
  normalizeUsername,
  parseLinks,
  readLinks,
  usernameError,
} from "@/lib/profile/validation";

describe("usernames", () => {
  it("are lowercase without the @", () => {
    expect(normalizeUsername("  @Ada_Lovelace ")).toBe("ada_lovelace");
  });
  it("allow 3–20 letters, numbers and underscores", () => {
    expect(usernameError("ada")).toBeNull();
    expect(usernameError("pixel_pig_2026")).toBeNull();
    expect(usernameError("ab")).toMatch(/3–20/);
    expect(usernameError("a".repeat(21))).toMatch(/3–20/);
    expect(usernameError("ada-lovelace")).toMatch(/letters, numbers/);
    expect(usernameError("adà")).toMatch(/letters, numbers/);
  });
  it("keep names that could pass for Pigxel", () => {
    expect(usernameError("pigxel")).toMatch(/reserved/);
    expect(usernameError("support")).toMatch(/reserved/);
  });
});

describe("links", () => {
  it("become https addresses", () => {
    expect(normalizeUrl("pinterest.com/ada")).toBe("https://pinterest.com/ada");
    expect(normalizeUrl("http://ada.art")).toBe("https://ada.art/");
    expect(normalizeUrl(" https://www.artstation.com/ada ")).toBe(
      "https://www.artstation.com/ada",
    );
  });
  it("must be web addresses", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("ftp://ada.art")).toBeNull();
    expect(normalizeUrl("localhost")).toBeNull();
    expect(normalizeUrl("ada art.com")).toBeNull();
    expect(normalizeUrl("https://user:pass@ada.art")).toBeNull();
    expect(normalizeUrl(`https://ada.art/${"a".repeat(200)}`)).toBeNull();
  });
  it("are read from the form, skipping empty rows", () => {
    expect(
      parseLinks(["pinterest.com/ada", "", "ada.art"], ["", "", "Portfolio"]),
    ).toEqual({
      links: [
        { url: "https://pinterest.com/ada" },
        { label: "Portfolio", url: "https://ada.art/" },
      ],
    });
  });
  it("need an address when they have a name", () => {
    expect(parseLinks([""], ["Shop"])).toEqual({
      error: "Add the address for “Shop”.",
    });
  });
  it("are limited to three", () => {
    const urls = ["a.art", "b.art", "c.art", "d.art"];
    expect(parseLinks(urls, [])).toEqual({ error: "Add up to 3 links." });
  });
  it("reject what isn't a web address", () => {
    expect(parseLinks(["not a link"], [])).toEqual({
      error: "“not a link” isn’t a valid web address.",
    });
  });
  it("are named after known sites, or their domain", () => {
    expect(linkTitle({ url: "https://www.pinterest.com/ada" })).toBe(
      "Pinterest",
    );
    expect(linkTitle({ url: "https://ada.artstation.com/" })).toBe(
      "ArtStation",
    );
    expect(linkTitle({ url: "https://x.com/ada" })).toBe("X");
    expect(linkTitle({ url: "https://www.ada.art/" })).toBe("ada.art");
    expect(linkTitle({ label: "My shop", url: "https://ada.art" })).toBe(
      "My shop",
    );
  });
  it("drop malformed entries read back from the database", () => {
    expect(
      readLinks([
        { url: "https://ada.art" },
        { url: "http://old.art" },
        "https://text.art",
        { label: "Shop", url: "https://shop.art" },
      ]),
    ).toEqual([
      { url: "https://ada.art" },
      { label: "Shop", url: "https://shop.art" },
    ]);
    expect(readLinks(null)).toEqual([]);
  });
});

describe("profiles", () => {
  const row: ProfileRow = {
    id: "user-1",
    username: "ada",
    display_name: "Ada",
    bio: "",
    links: [],
    avatar_kind: "provider",
    provider_avatar_url: "https://lh3.googleusercontent.com/a/ada",
    avatar_path: null,
    visibility: "public",
    created_at: "2026-09-29T10:00:00Z",
    premium_since: null,
  };
  it("show the chosen picture", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    expect(toArtistProfile(row).avatarUrl).toBe(row.provider_avatar_url);
    expect(
      toArtistProfile({ ...row, avatar_kind: "none" }).avatarUrl,
    ).toBeNull();
    expect(
      toArtistProfile({
        ...row,
        avatar_kind: "upload",
        avatar_path: "user-1/a.png",
      }).avatarUrl,
    ).toBe(
      "https://project.supabase.co/storage/v1/object/public/avatars/user-1/a.png",
    );
  });
  it("say when the artist joined", () => {
    expect(joinedLabel(row.created_at)).toBe("Joined September 2026");
    expect(joinedLabel("not a date")).toBeNull();
  });
});
