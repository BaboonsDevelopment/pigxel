import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ user: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ usePathname: () => "/missing" }));
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Pixel: () => ({ variable: "" }),
}));
vi.mock("@/lib/auth/session", () => ({ getUser: mocks.user }));
// Picture imports have no size in tests; the links are what matter here.
vi.mock("@/components/ui/brand", () => ({ BrandMascot: () => null }));

import NotFound from "@/app/not-found";

const render = async () => renderToStaticMarkup(await NotFound());

beforeEach(() => vi.resetAllMocks());

describe("404 page", () => {
  it("sends guests to the landing page", async () => {
    mocks.user.mockResolvedValue(null);
    const html = await render();
    expect(html).toContain("This page wandered off");
    expect(html).toContain('href="/"');
    expect(html).toContain("Go to Pigxel");
    expect(html).toContain('href="/explore"');
  });

  it("sends signed-in people to Home", async () => {
    mocks.user.mockResolvedValue({ id: "user-1" });
    const html = await render();
    expect(html).toContain('href="/home"');
    expect(html).toContain("Go to Home");
  });
});
