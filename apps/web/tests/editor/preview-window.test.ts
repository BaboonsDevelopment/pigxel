import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fitPreviewBox,
  readPreviewBox,
  writePreviewBox,
} from "@/features/editor/components/preview/window-state";

afterEach(() => vi.unstubAllGlobals());
function browser() {
  const data = new Map<string, string>();
  vi.stubGlobal("window", { innerWidth: 1000, innerHeight: 800 });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
  return data;
}
describe("preview window persistence", () => {
  it("restores position and dimensions separately for each user", () => {
    browser();
    const box = { x: 40, y: 70, w: 360, h: 300 };
    writePreviewBox("one", box);
    expect(readPreviewBox("one")).toEqual(box);
    expect(readPreviewBox("two")).toEqual({ x: 716, y: 120, w: 260, h: 240 });
  });
  it("fits saved windows to a smaller viewport and enforces minimum sizes", () => {
    expect(fitPreviewBox({ x: 900, y: 700, w: 600, h: 500 }, 400, 300)).toEqual(
      { x: 0, y: 0, w: 400, h: 300 },
    );
    expect(fitPreviewBox({ x: -10, y: -30, w: 1, h: 1 }, 1000, 800)).toEqual({
      x: 0,
      y: 0,
      w: 160,
      h: 120,
    });
  });
  it("falls back for invalid or unavailable storage", () => {
    const data = browser();
    for (const saved of [
      "bad json",
      '{"x":null,"y":2,"w":300,"h":200}',
      '{"x":1,"y":2,"w":-1,"h":200}',
    ]) {
      data.set("pigxel:preview-window:v1:one", saved);
      expect(readPreviewBox("one").w).toBe(260);
    }
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("Unavailable");
      },
      setItem: () => {
        throw new Error("Unavailable");
      },
    });
    expect(readPreviewBox("one").w).toBe(260);
    expect(() =>
      writePreviewBox("one", { x: 0, y: 0, w: 260, h: 240 }),
    ).not.toThrow();
  });
});
