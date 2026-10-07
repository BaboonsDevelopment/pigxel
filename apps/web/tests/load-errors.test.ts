import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { shownFrom } from "@/lib/utils/shown";

const mocks = vi.hoisted(() => ({
  listFeedback: vi.fn(),
  countFeedback: vi.fn(),
  listAssets: vi.fn(),
  listPublicTiles: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/font/google", () => ({
  Pixelify_Sans: () => ({ className: "" }),
  Manrope: () => ({ className: "" }),
  Inter: () => ({ className: "" }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  getUser: async () => ({ id: "user-1" }),
  requireUser: async () => ({ id: "user-1" }),
  isAdmin: () => true,
}));
vi.mock("@/features/feedback/server", () => ({
  listFeedback: mocks.listFeedback,
  countFeedback: mocks.countFeedback,
}));
vi.mock("@/features/assets/server", () => ({ listAssets: mocks.listAssets }));
vi.mock("@/features/profile/server", () => ({
  listPublicTiles: mocks.listPublicTiles,
}));

import Feedback from "@/app/(app)/feedback/page";
import Assets from "@/app/(app)/assets/page";
import Explore from "@/app/(app)/explore/page";

const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.countFeedback.mockResolvedValue({ open: 3, closed: 1 });
});

describe("shownFrom", () => {
  it("rounds up to whole batches and caps the total", () => {
    expect(shownFrom(undefined, 50)).toBe(50);
    expect(shownFrom("abc", 50)).toBe(50);
    expect(shownFrom("-10", 50)).toBe(50);
    expect(shownFrom("100", 50)).toBe(100);
    expect(shownFrom("75", 50)).toBe(100);
    expect(shownFrom("999999", 50)).toBe(1000);
  });
});

describe("feedback board", () => {
  const item = (id: number) => ({
    id,
    kind: "bug",
    title: `Bug ${id}`,
    description: "",
    status: "open",
    votes: 0,
    createdAt: "2026-10-01T00:00:00Z",
    ago: "1d",
    author: null,
    voted: false,
  });
  const render = async (params: Record<string, string> = {}) =>
    renderToStaticMarkup(
      await Feedback({ searchParams: Promise.resolve(params) }),
    );

  it("says it couldn't load instead of showing an empty board", async () => {
    quiet();
    mocks.listFeedback.mockRejectedValue(new Error("db down"));
    const html = await render();
    expect(html).toContain("Couldn’t load feedback.");
    expect(html).not.toContain("No open feature requests");
  });

  it("shows the next 50 with Show more", async () => {
    mocks.listFeedback.mockResolvedValue(
      Array.from({ length: 51 }, (_, i) => item(i + 1)),
    );
    const html = await render();
    expect(mocks.listFeedback).toHaveBeenCalledWith(expect.anything(), 51);
    expect(html).toContain("Bug 50");
    expect(html).not.toContain("Bug 51");
    expect(html).toContain("shown=100");
  });

  it("asks for more once Show more is used, and stops at the end", async () => {
    mocks.listFeedback.mockResolvedValue([item(1)]);
    const html = await render({ shown: "100" });
    expect(mocks.listFeedback).toHaveBeenCalledWith(expect.anything(), 101);
    expect(html).not.toContain("Show more");
  });

  it("drops the numbers when counts fail, rather than showing zeros", async () => {
    mocks.countFeedback.mockResolvedValue(null);
    mocks.listFeedback.mockResolvedValue([]);
    const html = await render();
    expect(html).toContain(">Open<");
    expect(html).not.toContain("0 Open");
  });
});

describe("assets", () => {
  const render = async (params: Record<string, string> = {}) =>
    renderToStaticMarkup(
      await Assets({ searchParams: Promise.resolve(params) }),
    );
  const asset = (i: number) => ({
    id: `a${i}`,
    name: `Asset ${i}`,
    category: "characters",
    width: 16,
    height: 16,
    url: "/a.png",
  });

  it("says it couldn't load instead of offering the starter set", async () => {
    quiet();
    mocks.listAssets.mockRejectedValue(new Error("db down"));
    const html = await render();
    expect(html).toContain("Couldn’t load assets.");
    expect(html).not.toContain("No assets yet");
  });

  it("links to the next batch on a category page", async () => {
    mocks.listAssets.mockResolvedValue({
      assets: [asset(1), asset(2)],
      total: 500,
    });
    const html = await render({ type: "characters" });
    expect(mocks.listAssets).toHaveBeenCalledWith("characters", 240);
    expect(html).toContain("/assets?type=characters&amp;shown=480");
  });
});

describe("explore", () => {
  it("says it couldn't load instead of “no tiles”", async () => {
    quiet();
    mocks.listPublicTiles.mockRejectedValue(new Error("db down"));
    const html = renderToStaticMarkup(
      await Explore({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("Couldn’t load popular tiles");
    expect(html).not.toContain("No tiles in this period");
  });
});
