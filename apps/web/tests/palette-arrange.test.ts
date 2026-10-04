import { describe, expect, it } from "vitest";
import { rampBetween, sortedPalette, withColors } from "@/lib/palette/arrange";

describe("palette tools", () => {
  it("makes a ramp from one colour to another, both ends included", () => {
    expect(rampBetween("#000000", "#ffffff", 3)).toEqual([
      "#000000",
      "#808080",
      "#ffffff",
    ]);
    expect(rampBetween("#102040", "#80c0ff", 6)).toHaveLength(6);
    expect(rampBetween("#ff000000", "#ff0000", 2)).toEqual([
      "#ff000000",
      "#ff0000",
    ]);
  });
  it("sorts by hue, greys last", () => {
    expect(
      sortedPalette(["#0000ff", "#808080", "#ff0000", "#00ff00"], "hue"),
    ).toEqual(["#ff0000", "#00ff00", "#0000ff", "#808080"]);
  });
  it("sorts by brightness", () => {
    expect(
      sortedPalette(["#ffffff", "#000000", "#808080"], "brightness"),
    ).toEqual(["#000000", "#808080", "#ffffff"]);
  });
  it("adds colours once, up to the limit", () => {
    expect(withColors(["#000000"], ["#000000", "#ffffff"], 256)).toEqual([
      "#000000",
      "#ffffff",
    ]);
    expect(withColors(["#000000"], ["#111111", "#222222"], 2)).toEqual([
      "#000000",
      "#111111",
    ]);
  });
});
