import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { animate } from "@/features/ai/components/chat-panel/flows/animate";
import { edit } from "@/features/ai/components/chat-panel/flows/edit";
import * as actions from "@/features/ai/actions";
import {
  framesSheet,
  toArt,
  toReference,
} from "@/features/ai/components/chat-panel/flows/pictures";
import type {
  Chat,
  ChatEntry,
} from "@/features/ai/components/chat-panel/constants";
import {
  REDRAWN_PICTURE_STEPS,
  SCENE_PICTURE_STEPS,
  runSteps,
} from "@/lib/image/pipeline";
import { sheetToFrames } from "@/lib/image/sheet";

vi.mock("@/features/ai/actions", () => ({
  generateAnimation: vi.fn(),
  planAnimation: vi.fn(),
  reviewEdit: vi.fn(),
  planEdit: vi.fn(),
  redrawArea: vi.fn(),
  redrawFrames: vi.fn(),
}));
vi.mock("@/features/ai/components/chat-panel/flows/pictures", () => ({
  framesSheet: vi.fn(),
  toArt: vi.fn(),
  toReference: vi.fn(),
}));
vi.mock("@/lib/image/sheet", () => ({ sheetToFrames: vi.fn() }));

const size = { w: 4, h: 4 };
const area = { x: 0, y: 0, ...size };
const solid = (r: number) =>
  new Uint8ClampedArray(
    Array.from({ length: 16 }, () => [r, 80, 60, 255]).flat(),
  );
const character = solid(100);
const background = solid(20);
const poses = Array.from({ length: 10 }, (_, i) => `pose ${i + 1}`);
function chat(): Chat {
  return {
    messages: [],
    references: [],
    selectArea: false,
    append: vi.fn(),
    say: vi.fn(),
    setPending: vi.fn(),
    setError: vi.fn(),
    canvas: {
      size: () => size,
      isEmpty: () => false,
      freeArea: () => null,
      snapshot: () => "reference",
      overlapsDrawing: () => false,
      layers: () => [
        { id: "background", name: "Background", editable: true, box: area },
        { id: "character", name: "Character", editable: true, box: area },
      ],
      objects: () => [{ area, layerId: "character" }],
      activeLayer: () => "character",
      frameId: () => "frame",
      framesOf: () => ["frame"],
      readCel: (id) => (id === "character" ? character : background),
      writeCels: vi.fn(),
      snapshotCel: () => "reference",
      addLayer: vi.fn(),
      addLayers: vi.fn(),
      cutToLayer: vi.fn(),
      addAnimation: vi.fn(),
      play: vi.fn(),
      undo: vi.fn(),
      selectArea: vi.fn(),
      adjustArea: vi.fn(),
      highlight: vi.fn(),
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ blob: async () => new Blob() }),
  );
  vi.mocked(framesSheet).mockReturnValue("reference-sheet");
  vi.mocked(actions.planAnimation).mockResolvedValue({
    ok: true,
    value: {
      name: "Idle",
      frameCount: 10,
      duration: 100,
      summary: "Idle",
      tracks: [
        { name: "Character", subject: "a knight", reuse: 1, box: area, poses },
      ],
    },
  });
  vi.mocked(actions.generateAnimation).mockResolvedValue({
    ok: true,
    value: {
      image: "sheet",
      frames: poses.map(() => Buffer.from(character).toString("base64")),
    },
  });
  vi.mocked(actions.reviewEdit).mockResolvedValue({
    ok: true,
    value: { ok: true, problem: "", instruction: "" },
  });
  vi.mocked(actions.planEdit).mockResolvedValue({
    ok: true,
    value: {
      source: area,
      target: area,
      objects: [0],
      keep: [],
      instruction: "recolour skin",
      summary: "Recoloured",
      question: "",
    },
  });
  vi.mocked(actions.redrawArea).mockResolvedValue({
    ok: true,
    value: "redrawn",
  });
  vi.mocked(toArt).mockResolvedValue({ ...size, rgba: solid(110) });
});
afterEach(() => vi.unstubAllGlobals());

async function draw(c: Chat) {
  await animate(c, { kind: "animate", request: "idle" });
  const entries = vi.mocked(c.append).mock.calls.map(([entry]) => entry);
  const button = entries.find((entry: ChatEntry) => entry.button)?.button;
  expect(button).toBeDefined();
  return button!.run();
}

describe("animation safeguards", () => {
  it("uses the selected character layer and one complete chronological sheet", async () => {
    const c = chat();
    expect(await draw(c)).toBe(true);
    expect(actions.generateAnimation).toHaveBeenCalledTimes(1);
    expect(actions.generateAnimation).toHaveBeenCalledWith(
      expect.objectContaining({
        poses,
        sheet: "reference-sheet",
        cellW: 4,
        cellH: 4,
      }),
    );
    expect(
      vi
        .mocked(framesSheet)
        .mock.calls[0]![0].every((cel) => cel === character),
    ).toBe(true);
    expect(
      vi.mocked(c.canvas.addAnimation).mock.calls[0]![0].layers[0]!.replaces,
    ).toBe("character");
  });
  it("does not insert a random fallback when a frame is missing", async () => {
    const c = chat();
    vi.mocked(actions.generateAnimation).mockResolvedValue({
      ok: true,
      value: {
        image: "sheet",
        frames: poses
          .slice(1)
          .map(() => Buffer.from(character).toString("base64")),
      },
    });
    expect(await draw(c)).toBe(false);
    expect(c.canvas.addAnimation).not.toHaveBeenCalled();
  });
  it("preserves intentional travel rather than ground-locking it", async () => {
    const c = chat();
    vi.mocked(actions.planAnimation).mockResolvedValue({
      ok: true,
      value: {
        name: "Jump",
        frameCount: 10,
        duration: 100,
        summary: "Jump",
        tracks: [
          {
            name: "Character",
            subject: "jump",
            reuse: 1,
            box: area,
            poses,
            anchor: "fixed",
          },
        ],
      },
    });
    expect(await draw(c)).toBe(true);
    expect(actions.generateAnimation).toHaveBeenCalledWith(
      expect.objectContaining({ anchor: "fixed" }),
    );
  });
  it("does not apply an animation rejected for inconsistent poses", async () => {
    const c = chat();
    vi.mocked(actions.generateAnimation).mockResolvedValue({
      ok: false,
      error:
        "Frame 5 is a different creature. No tokens were charged for this generation.",
    });
    expect(await draw(c)).toBe(false);
    expect(c.canvas.addAnimation).not.toHaveBeenCalled();
    expect(c.setError).toHaveBeenCalledWith(expect.stringContaining("Frame 5"));
  });
});

describe("edit by redraw", () => {
  it("applies the redraw without a review step", async () => {
    const c = chat();
    await edit(c, { kind: "edit", request: "make skin blue" });
    expect(actions.redrawArea).toHaveBeenCalledTimes(1);
    expect(actions.reviewEdit).not.toHaveBeenCalled();
    expect(c.canvas.writeCels).toHaveBeenCalledTimes(1);
    const cels = vi.mocked(c.canvas.writeCels).mock.calls[0]![1];
    expect(cels.get("frame")).toEqual(solid(110));
    expect(c.setPending).toHaveBeenLastCalledWith(false);
  });
  it("sends the screen, the layer's original picture and the user's references", async () => {
    const c = chat();
    c.references = ["external-reference"];
    c.messages = [
      { role: "assistant", content: "old", image: "older", layer: "character" },
      { role: "assistant", content: "other", image: "x", layer: "background" },
      {
        role: "assistant",
        content: "new",
        image: "latest",
        layer: "character",
      },
    ];
    vi.mocked(toReference).mockResolvedValue("original-reference");
    await edit(c, { kind: "edit", request: "make skin blue" });
    expect(fetch).toHaveBeenCalledWith("latest");
    expect(actions.planEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        references: [{ dataUrl: "external-reference" }],
      }),
    );
    expect(actions.redrawArea).toHaveBeenCalledWith({
      request: "recolour skin",
      picture: "reference",
      width: 4,
      height: 4,
      references: [{ dataUrl: "external-reference" }],
      original: "original-reference",
      composition: "sprite",
    });
    expect(c.append).toHaveBeenLastCalledWith(
      expect.objectContaining({ image: "redrawn", layer: "character" }),
    );
  });
  it("sends no original when the layer has no picture in the chat", async () => {
    const c = chat();
    await edit(c, { kind: "edit", request: "make skin blue" });
    expect(toReference).not.toHaveBeenCalled();
    expect(actions.redrawArea).toHaveBeenCalledWith({
      request: "recolour skin",
      picture: "reference",
      width: 4,
      height: 4,
      references: [],
      original: "",
      composition: "sprite",
    });
  });
  it("fills the scene canvas even when the returned image is portrait-shaped and the planner protected the old connected picture", async () => {
    const c = chat();
    vi.mocked(actions.planEdit).mockResolvedValue({
      ok: true,
      value: {
        source: area,
        target: area,
        objects: [0],
        keep: [area],
        instruction: "fill the entire background",
        summary: "Filled background",
        question: "",
      },
    });
    const portrait = {
      w: 2,
      h: 4,
      rgba: new Uint8ClampedArray(
        Array.from({ length: 8 }, () => [50, 120, 80, 255]).flat(),
      ),
    };
    vi.mocked(toArt).mockImplementation(async (_, target, steps) =>
      runSteps(portrait, target, steps!),
    );
    await edit(c, {
      kind: "edit",
      request: "fix the missing background",
      composition: "scene",
    });
    expect(actions.planEdit).toHaveBeenCalledWith(
      expect.objectContaining({ composition: "scene", width: 4, height: 4 }),
    );
    expect(actions.redrawArea).toHaveBeenCalledWith({
      request: "fill the entire background",
      picture: "reference",
      width: 4,
      height: 4,
      references: [],
      original: "",
      composition: "scene",
    });
    expect(toArt).toHaveBeenCalledWith("redrawn", area, SCENE_PICTURE_STEPS);
    const pixels = vi
      .mocked(c.canvas.writeCels)
      .mock.calls[0]![1].get("frame")!;
    for (let i = 3; i < pixels.length; i += 4) expect(pixels[i]).toBe(255);
    expect(pixels).not.toEqual(character);
    expect(c.say).not.toHaveBeenCalled();
    expect(c.append).toHaveBeenLastCalledWith(
      expect.objectContaining({ image: "redrawn" }),
    );
  });
  it("limits a scene repair to an explicit selection without restoring the connected old scene over it", async () => {
    const c = chat();
    const selected = { x: 1, y: 1, w: 2, h: 2 };
    c.selectArea = true;
    vi.mocked(c.canvas.selectArea).mockResolvedValue(selected);
    vi.mocked(actions.planEdit).mockResolvedValue({
      ok: true,
      value: {
        source: selected,
        target: selected,
        objects: [0],
        keep: [area],
        instruction: "fill the background",
        summary: "Filled",
        question: "",
      },
    });
    vi.mocked(toArt).mockResolvedValue({
      w: 2,
      h: 2,
      rgba: solid(110).slice(0, 16),
    });
    await edit(c, {
      kind: "edit",
      request: "fill the background here",
      composition: "scene",
    });
    const pixels = vi
      .mocked(c.canvas.writeCels)
      .mock.calls[0]![1].get("frame")!;
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++)
        expect(pixels[(y * 4 + x) * 4]).toBe(
          x >= 1 && x < 3 && y >= 1 && y < 3 ? 110 : 100,
        );
  });
  it("continues to use sprite background removal for ordinary material edits", async () => {
    const c = chat();
    await edit(c, { kind: "edit", request: "make skin blue" });
    expect(toArt).toHaveBeenCalledWith("redrawn", area, REDRAWN_PICTURE_STEPS);
  });
  it("uses one complete canvas for every scene frame and retains backgrounds while cutting the sheet", async () => {
    const c = chat();
    const narrow = new Uint8ClampedArray(character);
    for (let y = 0; y < size.h; y++) {
      narrow.fill(0, y * size.w * 4, (y * size.w + 1) * 4);
      narrow.fill(0, (y * size.w + 3) * 4, (y * size.w + 4) * 4);
    }
    c.canvas.framesOf = () => ["frame", "other-frame"];
    c.canvas.readCel = () => narrow;
    vi.mocked(actions.redrawFrames).mockResolvedValue({
      ok: true,
      value: {
        image: "scene-sheet",
        layout: { cols: 2, rows: 1, aspectRatio: "2:1" },
      },
    });
    vi.mocked(sheetToFrames).mockResolvedValue([
      { ...size, rgba: solid(110) },
      { ...size, rgba: solid(120) },
    ]);
    await edit(c, {
      kind: "edit",
      request: "fill the background in all frames",
      composition: "scene",
    });
    expect(actions.redrawFrames).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 2,
        cellW: 4,
        cellH: 4,
        composition: "scene",
      }),
    );
    expect(sheetToFrames).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.any(Object),
      2,
      area,
      "cells",
      true,
    );
    const cels = vi.mocked(c.canvas.writeCels).mock.calls[0]![1];
    expect(cels.get("frame")).toEqual(solid(110));
    expect(cels.get("other-frame")).toEqual(solid(120));
    expect(c.say).not.toHaveBeenCalled();
  });
});
