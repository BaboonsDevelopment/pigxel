import { describe, expect, it } from "vitest";
import {
  highlightParts,
  searchWords,
} from "@/features/explore/components/popular-card/helpers";

describe("searchWords", () => {
  it("splits on spaces and punctuation, lowercased", () => {
    expect(searchWords("  Black-Cat, @Mia ")).toEqual(["black", "cat", "mia"]);
  });

  it("keeps letters of any alphabet", () => {
    expect(searchWords("Котик дім")).toEqual(["котик", "дім"]);
  });
});

describe("highlightParts", () => {
  it("marks every match, ignoring case", () => {
    expect(highlightParts("Cat and cat", ["cat"])).toEqual([
      { text: "Cat", hit: true },
      { text: " and ", hit: false },
      { text: "cat", hit: true },
    ]);
  });

  it("merges overlapping words", () => {
    expect(highlightParts("Castle", ["cas", "stle"])).toEqual([
      { text: "Castle", hit: true },
    ]);
  });

  it("leaves text without matches whole", () => {
    expect(highlightParts("Dragon", ["cat"])).toEqual([
      { text: "Dragon", hit: false },
    ]);
  });
});
