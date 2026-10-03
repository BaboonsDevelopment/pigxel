import { describe, expect, it } from "vitest";
import { frameDropIndex } from "@/components/timeline/helpers";
import {
  clampDuration,
  insertFrame,
  moveFrame,
  removeFrame,
  stepFrame,
  updateFrame,
} from "@/lib/sprite/frames";
import { record, redo, startHistory, undo } from "@/lib/sprite/history";
import type { Frame } from "@/lib/sprite/types";

const frame = (id: string, duration = 100): Frame => ({ id, duration });
const ids = (frames: Frame[]) => frames.map((f) => f.id).join("");

describe("frames", () => {
  const frames = ["a", "b", "c", "d"].map((id) => frame(id));

  it("inserts, removes and times frames", () => {
    expect(ids(insertFrame(frames, frame("x"), 1))).toBe("axbcd");
    expect(ids(removeFrame(frames, "c"))).toBe("abd");
    expect(updateFrame(frames, "b", { duration: 40 })[1]).toEqual(
      frame("b", 40),
    );
  });
  it("moves a frame to an index of the list without it", () => {
    expect(ids(moveFrame(frames, "a", 3))).toBe("bcda");
    expect(ids(moveFrame(frames, "d", 0))).toBe("dabc");
    expect(ids(moveFrame(frames, "b", 99))).toBe("acdb");
    expect(moveFrame(frames, "zz", 0)).toBe(frames);
  });
  it("steps through frames, wrapping around at both ends", () => {
    expect(stepFrame(frames, "d", 1).id).toBe("a");
    expect(stepFrame(frames, "a", -1).id).toBe("d");
    expect(stepFrame(frames, "b", 2).id).toBe("d");
  });
  it("keeps durations whole and in range", () => {
    expect(clampDuration(12.6)).toBe(13);
    expect(clampDuration(0)).toBe(1);
    expect(clampDuration(1e9)).toBe(65535);
    expect(clampDuration(NaN)).toBe(100);
  });
  it("turns a drop beside a frame into the index moveFrame expects", () => {
    expect(ids(moveFrame(frames, "a", frameDropIndex(0, 2, "after")))).toBe(
      "bcad",
    );
    expect(ids(moveFrame(frames, "d", frameDropIndex(3, 1, "before")))).toBe(
      "adbc",
    );
  });
});

describe("history", () => {
  it("undoes and redoes, and a new step drops what could be redone", () => {
    let h = startHistory(1);
    h = record(h, 2, 10);
    h = record(h, 3, 10);
    h = undo(h)!;
    expect(h.present).toBe(2);
    h = redo(h)!;
    expect(h.present).toBe(3);
    h = record(undo(h)!, 4, 10);
    expect(h.present).toBe(4);
    expect(redo(h)).toBeNull();
    expect(undo(startHistory(1))).toBeNull();
  });
  it("keeps only the latest steps", () => {
    let h = startHistory(0);
    for (let i = 1; i <= 5; i++) h = record(h, i, 3);
    expect(h.past).toEqual([2, 3, 4]);
  });
});
