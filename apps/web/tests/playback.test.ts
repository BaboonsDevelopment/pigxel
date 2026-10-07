import { describe, expect, it } from "vitest";
import { playSequence } from "@/lib/sprite/tags";

describe("playback without tags", () => {
  it("plays every frame in order", () => {
    expect(playSequence(4, "loop")).toEqual([0, 1, 2, 3]);
    expect(playSequence(4, "once")).toEqual([0, 1, 2, 3]);
  });
  it("goes back and forth in ping-pong", () => {
    expect(playSequence(4, "pingpong")).toEqual([0, 1, 2, 3, 2, 1]);
  });
});
