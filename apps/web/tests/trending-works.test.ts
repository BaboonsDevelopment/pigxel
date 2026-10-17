import { beforeEach, describe, expect, it, vi } from "vitest";

const listPublicTiles = vi.hoisted(() => vi.fn());
vi.mock("@/features/profile/server", () => ({ listPublicTiles }));

import { listTrendingWorks } from "@/features/home/trending";

const works = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `t${i}` }));

beforeEach(() => listPublicTiles.mockReset());

describe("trending works on Home", () => {
  it("shows this week's most popular, like Explore", async () => {
    listPublicTiles.mockResolvedValueOnce({ tiles: works(3), count: 9 });
    expect(await listTrendingWorks("me")).toHaveLength(3);
    expect(listPublicTiles).toHaveBeenCalledTimes(1);
    expect(listPublicTiles.mock.calls[0]!.slice(0, 5)).toEqual([
      0,
      3,
      7,
      "me",
      [],
    ]);
  });

  it("falls back to all time in a quiet week", async () => {
    listPublicTiles
      .mockResolvedValueOnce({ tiles: works(1), count: 1 })
      .mockResolvedValueOnce({ tiles: works(3), count: 40 });
    expect(await listTrendingWorks("me")).toHaveLength(3);
    expect(listPublicTiles.mock.calls[1]![2]).toBe(0);
  });
});
