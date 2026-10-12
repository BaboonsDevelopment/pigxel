import { describe, expect, it } from "vitest";
import { fingerprint } from "@/lib/pigxel-file/history-store";

describe("kept undo history", () => {
  it("matches only the exact same tile file", () => {
    expect(fingerprint('{"a":1}')).toBe(fingerprint('{"a":1}'));
    expect(fingerprint('{"a":1}')).not.toBe(fingerprint('{"a":2}'));
    expect(fingerprint("ab")).not.toBe(fingerprint("ab "));
  });
});
