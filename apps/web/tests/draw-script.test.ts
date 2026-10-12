import { describe, expect, it } from "vitest";
import {
  buildDrawScript,
  finalGrid,
  mirrorOf,
  pigColors,
} from "@/features/landing/components/feature-tour/draw-script";

const script = buildDrawScript();
const paints = script.actions.filter((a) => a.type === "paint");

describe("the Draw chapter's recording", () => {
  it("ends with exactly the Pigxel pig", () => {
    expect(finalGrid(script)).toEqual(pigColors());
  });

  it("draws the outline and details with mirror on: every stroke has its twin", () => {
    for (const paint of paints.filter((p) => p.mirrored))
      expect(
        paints.some(
          (p) =>
            !p.mirrored &&
            p.at === paint.at &&
            p.cell === mirrorOf(paint.cell) &&
            p.color === paint.color,
        ),
      ).toBe(true);
  });

  it("paints every pixel once, except the details it draws over the fill", () => {
    const counts = new Map<number, number>();
    for (const p of paints) counts.set(p.cell, (counts.get(p.cell) ?? 0) + 1);
    expect([...counts.values()].every((n) => n === 1)).toBe(true);
  });

  it("keeps its timeline in order and the cursor ahead of it", () => {
    const times = script.actions.map((a) => a.at);
    expect(times).toEqual([...times].sort((p, q) => p - q));
    const waypoints = script.waypoints.map((w) => w.at);
    expect(waypoints).toEqual([...waypoints].sort((p, q) => p - q));
    expect(script.duration).toBeGreaterThan(Math.max(...times));
    expect(script.duration).toBeLessThan(9000);
  });

  it("picks each colour and tool from the dock before using it", () => {
    const presses = script.actions.filter((a) => a.type === "press");
    const uis = presses.flatMap((p) => ("ui" in p.target ? [p.target.ui] : []));
    expect(uis).toEqual(["color-b", "tool-bucket", "color-k", "tool-pencil"]);
  });
});
