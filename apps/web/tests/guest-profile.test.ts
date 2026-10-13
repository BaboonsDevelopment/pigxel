import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  follows: vi.fn(),
  tiles: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/font/google", () => ({
  Tiny5: () => ({ style: {} }),
  DotGothic16: () => ({ style: {} }),
  Silkscreen: () => ({ style: {} }),
  Press_Start_2P: () => ({ style: {} }),
  Pixelify_Sans: () => ({ className: "" }),
  Madimi_One: () => ({ className: "" }),
  Manrope: () => ({ className: "" }),
  Inter: () => ({ className: "" }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/auth/session", () => ({ getUser: mocks.user }));
vi.mock("@/features/collections/server", () => ({
  listProfileCollections: async () => [],
}));

vi.mock("@/features/profile/server", () => ({
  findProfile: async () => ({
    kind: "found",
    profile: {
      id: "artist-1",
      username: "pixel_pig",
      name: "Pixel Pig",
      bio: "I draw pigs.",
      location: "",
      links: [],
      avatarUrl: null,
      visibility: "public",
      joinedAt: "2026-09-01T00:00:00Z",
      premiumSince: null,
    },
  }),
  listProfileArts: mocks.tiles,
  listProfileTags: async () => [],
  getProfileActivity: async () => ({ days: new Map(), today: Date.now() }),
  listFollows: async () => ({ people: [], count: 0 }),
  getFollowStats: mocks.follows,
  hasBlocked: async () => false,
}));

import ArtistProfilePage from "@/app/(app)/u/[username]/page";

const render = async () =>
  renderToStaticMarkup(
    await ArtistProfilePage({
      params: Promise.resolve({ username: "pixel_pig" }),
    }),
  );

beforeEach(() => {
  vi.resetAllMocks();
  mocks.follows.mockResolvedValue({
    followers: 3,
    followed: 2,
    following: false,
  });
  mocks.tiles.mockResolvedValue({ tiles: [], count: 0 });
});

describe("artist profile for guests", () => {
  it("shows a public profile without signing in", async () => {
    mocks.user.mockResolvedValue(null);
    const html = await render();
    expect(html).toContain("Pixel Pig");
    expect(html).toContain("I draw pigs.");
    expect(html).toContain("followers");
    expect(mocks.follows).toHaveBeenCalledWith("artist-1", null);
  });

  it("asks guests to sign up to follow, then returns to the profile", async () => {
    mocks.user.mockResolvedValue(null);
    expect(await render()).toContain(
      'href="/login?mode=signup&amp;next=%2Fu%2Fpixel_pig"',
    );
  });

  it("keeps the real follow button for signed-in visitors", async () => {
    mocks.user.mockResolvedValue({ id: "viewer-1" });
    const html = await render();
    expect(html).not.toContain("next=%2Fu%2Fpixel_pig");
    expect(html).toContain('aria-label="Follow Pixel Pig"');
    expect(mocks.follows).toHaveBeenCalledWith("artist-1", "viewer-1");
  });

  it("says the arts couldn't load instead of “no published arts”", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.user.mockResolvedValue(null);
    mocks.tiles.mockRejectedValue(new Error("db down"));
    const html = await render();
    expect(html).toContain("Couldn’t load these arts");
    expect(html).not.toContain("No published arts yet");
  });
});
