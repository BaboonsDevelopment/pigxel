import { describe, expect, it } from "vitest";
import { frameRange, reversedFrames, withDuration } from "@/lib/sprite/frames";

const frames = ["a", "b", "c", "d", "e"].map((id) => ({ id, duration: 100 }));
const ids = (list: { id: string }[]) => list.map((f) => f.id).join("");

describe("frame operations", () => {
  it("reverses all frames when one or none is picked", () => {
    expect(ids(reversedFrames(frames, ["b"]))).toBe("edcba");
  });
  it("reverses only the picked frames in their places", () => {
    expect(ids(reversedFrames(frames, ["b", "c", "e"]))).toBe("aecdb");
  });
  it("sets one duration for the picked frames", () => {
    expect(withDuration(frames, ["a", "c"], 80).map((f) => f.duration)).toEqual(
      [80, 100, 80, 100, 100],
    );
  });
  it("picks a range either way", () => {
    expect(frameRange(frames, "d", "b")).toEqual(["b", "c", "d"]);
  });
});
