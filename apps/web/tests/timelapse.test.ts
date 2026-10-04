import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPORT,
  TIMELAPSE_FPS,
} from "@/features/editor/export/constants";
import {
  exportFiles,
  exportSize,
  stretchedSource,
  type ExportSource,
} from "@/features/editor/export/export";
import {
  artPlacement,
  outroTime,
  paint,
  paintOrder,
  strokesBy,
  timelapseSize,
  timelapseTiming,
} from "@/features/editor/export/timelapse";

const BLACK = [0, 0, 0, 255];
const RED = [255, 0, 0, 255];
const WHITE = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];

const picture = (...pixels: number[][]) =>
  Uint8ClampedArray.from(pixels.flat());

const replay = (stages: Uint8ClampedArray[], w: number, h: number) => {
  const strokes = paintOrder(stages, { w, h }, "layers");
  const canvas = new Uint8ClampedArray(w * h * 4);
  paint(canvas, strokes, 0, strokes.at.length);
  return canvas;
};

describe("paintOrder", () => {
  const size = { w: 3, h: 2 };
  const art = picture(WHITE, CLEAR, RED, BLACK, RED, WHITE);

  it("paints row by row and skips empty pixels", () => {
    const strokes = paintOrder([art], size, "rows");
    expect([...strokes.at]).toEqual([0, 2, 3, 4, 5]);
    expect([...strokes.rgba.subarray(4, 8)]).toEqual(RED);
  });

  it("paints the darkest colors first, then the most common", () => {
    const strokes = paintOrder([art], size, "colors");
    expect([...strokes.at]).toEqual([3, 2, 4, 0, 5]);
  });

  it("scatters every pixel in a repeatable order", () => {
    const first = paintOrder([art], size, "scatter");
    const again = paintOrder([art], size, "scatter");
    expect([...first.at]).toEqual([...again.at]);
    expect([...first.at].sort()).toEqual([0, 2, 3, 4, 5]);
  });

  it("grows outward from the center", () => {
    const wide = { w: 5, h: 1 };
    const row = picture(RED, RED, RED, RED, RED);
    const strokes = paintOrder([row], wide, "center");
    expect(strokes.at[0]).toBe(2);
    expect(new Set(strokes.at.subarray(1, 3))).toEqual(new Set([1, 3]));
    expect(new Set(strokes.at.subarray(3))).toEqual(new Set([0, 4]));
  });

  it("builds layer by layer, painting only what each layer changes", () => {
    const bottom = picture(WHITE, WHITE);
    const top = picture(WHITE, RED);
    const strokes = paintOrder([bottom, top], { w: 2, h: 1 }, "layers");
    expect([...strokes.at]).toEqual([0, 1, 1]);
    expect([...strokes.rgba.subarray(8)]).toEqual(RED);
    expect([...replay([bottom, top], 2, 1)]).toEqual([...top]);
  });

  it("paints nothing for an empty tile", () => {
    expect(paintOrder([], size, "rows").at.length).toBe(0);
    expect(paintOrder([], size, "layers").at.length).toBe(0);
  });

  it("ends on the finished picture in every style", () => {
    for (const style of ["rows", "colors", "scatter", "center"] as const) {
      const strokes = paintOrder([art], size, style);
      const canvas = new Uint8ClampedArray(art.length);
      paint(canvas, strokes, 0, strokes.at.length);
      expect([...canvas]).toEqual([...art]);
    }
  });
});

describe("timelapse timing", () => {
  const timing = timelapseTiming(10);

  it("adds a lead-in, a hold and the logo outro around the drawing", () => {
    expect(timing.draw).toBe(10 * TIMELAPSE_FPS);
    expect(timing.total).toBe(
      timing.leadIn + timing.draw + timing.hold + timing.outro,
    );
  });

  it("paints nothing during the lead-in and everything by the last drawing frame", () => {
    expect(strokesBy(0, timing, 100)).toBe(0);
    expect(strokesBy(timing.leadIn - 1, timing, 100)).toBe(0);
    expect(strokesBy(timing.leadIn, timing, 100)).toBeGreaterThan(0);
    expect(strokesBy(timing.leadIn + timing.draw - 1, timing, 100)).toBe(100);
    expect(strokesBy(timing.total - 1, timing, 100)).toBe(100);
  });

  it("never paints backwards", () => {
    let last = 0;
    for (let frame = 0; frame < timing.total; frame++) {
      const now = strokesBy(frame, timing, 37);
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
  });

  it("starts the outro once the finished art has been held", () => {
    const start = timing.leadIn + timing.draw + timing.hold;
    expect(outroTime(start - 1, timing)).toBeLessThan(0);
    expect(outroTime(start, timing)).toBe(0);
  });
});

describe("artPlacement", () => {
  it("scales small art up by whole pixels and centers it", () => {
    const video = timelapseSize("square");
    expect(artPlacement(video, { w: 30, h: 30 })).toEqual({
      x: 120,
      y: 120,
      w: 840,
      h: 840,
    });
  });

  it("fits wide art inside a vertical video", () => {
    const video = timelapseSize("vertical");
    const place = artPlacement(video, { w: 64, h: 16 });
    expect(place.w).toBe(832);
    expect(place.h).toBe(208);
    expect(place.y).toBe((1920 - 208) / 2);
  });

  it("shrinks art that is bigger than the video", () => {
    const place = artPlacement(timelapseSize("square"), { w: 2000, h: 1000 });
    expect(place.w).toBe(864);
    expect(place.h).toBe(432);
  });
});

describe("timelapse export settings", () => {
  const source: ExportSource = {
    name: "pig",
    size: { w: 2, h: 1 },
    frames: [{ id: "f1", duration: 100 }],
    frameId: "f1",
    background: "transparent",
    picture: () => picture(RED, WHITE),
    stages: () => [picture(RED, CLEAR), picture(RED, WHITE)],
    slices: [],
  };
  const settings = { ...DEFAULT_EXPORT, format: "timelapse" as const };

  it("reports the video size", () => {
    expect(exportSize(settings, source.size, 1)).toEqual({ w: 1080, h: 1920 });
    expect(
      exportSize({ ...settings, timelapseShape: "square" }, source.size, 1),
    ).toEqual({ w: 1080, h: 1080 });
  });

  it("is rendered separately from still exports", () => {
    expect(() => exportFiles(source, settings)).toThrow();
  });

  it("stretches every layer stage to the pixel ratio", () => {
    const stretched = stretchedSource(source, { w: 2, h: 1 });
    const stages = stretched.stages!("f1");
    expect(stages).toHaveLength(2);
    expect([...stages[1]!]).toEqual([...picture(RED, RED, WHITE, WHITE)]);
  });
});
