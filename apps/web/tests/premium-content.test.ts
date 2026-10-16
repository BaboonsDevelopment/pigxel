import { describe, expect, it } from "vitest";
import { isLocked } from "@/features/assets/assets";
import { TUTORIALS } from "@/features/tutorials/tutorials";

describe("premium assets", () => {
  it("locks premium assets the viewer can't open", () => {
    expect(isLocked({ premium: true, fileUrl: null })).toBe(true);
    expect(isLocked({ premium: true, fileUrl: "https://signed" })).toBe(false);
    expect(isLocked({ premium: false, fileUrl: "https://public" })).toBe(false);
  });
});

describe("premium tutorials", () => {
  it("has some", () => {
    expect(TUTORIALS.some((tutorial) => tutorial.premium)).toBe(true);
  });
});
