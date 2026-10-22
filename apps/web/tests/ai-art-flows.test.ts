import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { animate } from "@/features/ai/components/chat-panel/flows/animate";
import { edit } from "@/features/ai/components/chat-panel/flows/edit";
import * as actions from "@/features/ai/actions";
import {
  framesSheet,
  toArt,
} from "@/features/ai/components/chat-panel/flows/pictures";
import { checkEdit } from "@/features/ai/components/chat-panel/flows/review";
import { sheetToFrames } from "@/lib/image/sheet";
import type {
  Chat,
  ChatEntry,
} from "@/features/ai/components/chat-panel/constants";

vi.mock("@/features/ai/actions", () => ({
  animateSheet: vi.fn(),
  generateSheet: vi.fn(),
  planAnimation: vi.fn(),
  reviewEdit: vi.fn(),
  editTile: vi.fn(),
  planEdit: vi.fn(),
  redrawArea: vi.fn(),
  redrawFrames: vi.fn(),
}));
vi.mock("@/features/ai/components/chat-panel/flows/pictures", () => ({
  framesSheet: vi.fn(),
  toArt: vi.fn(),
}));
vi.mock("@/features/ai/components/chat-panel/flows/review", () => ({
  checkEdit: vi.fn(),
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
  vi.mocked(actions.animateSheet).mockResolvedValue({
    ok: true,
    value: { image: "sheet", layout: { cols: 5, rows: 2, aspectRatio: "5:2" } },
  });
  vi.mocked(sheetToFrames).mockResolvedValue(
    poses.map(() => ({ ...size, rgba: character })),
  );
  vi.mocked(actions.reviewEdit).mockResolvedValue({
    ok: true,
    value: { ok: true, problem: "", instruction: "" },
  });
  vi.mocked(actions.planEdit).mockResolvedValue({
    ok: true,
    value: {
      mode: "redraw",
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
    expect(actions.animateSheet).toHaveBeenCalledTimes(1);
    expect(vi.mocked(actions.animateSheet).mock.calls[0]![0].poses).toEqual(
      poses,
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
    vi.mocked(sheetToFrames).mockResolvedValue(
      poses.map((_, i) => (i === 4 ? null : { ...size, rgba: character })),
    );
    expect(await draw(c)).toBe(false);
    expect(c.canvas.addAnimation).not.toHaveBeenCalled();
  });
  it("does not apply an animation rejected for inconsistent poses", async () => {
    const c = chat();
    vi.mocked(actions.reviewEdit).mockResolvedValue({
      ok: true,
      value: {
        ok: false,
        problem: "Frame 5 is a different creature",
        instruction: "keep the same creature",
      },
    });
    expect(await draw(c)).toBe(false);
    expect(c.canvas.addAnimation).not.toHaveBeenCalled();
    expect(c.setError).toHaveBeenCalledWith(expect.stringContaining("Frame 5"));
  });
});

describe("edit safeguards", () => {
  it("keeps the original if both the edit and retry fail review", async () => {
    const c = chat();
    vi.mocked(checkEdit).mockResolvedValue({
      ok: false,
      problem: "lost the face",
      instruction: "preserve the face",
    });
    await edit(c, { kind: "edit", request: "make skin blue" });
    expect(actions.redrawArea).toHaveBeenCalledTimes(2);
    expect(checkEdit).toHaveBeenCalledTimes(2);
    expect(c.canvas.writeCels).not.toHaveBeenCalled();
    expect(c.setPending).toHaveBeenLastCalledWith(false);
  });
  it("applies the verified retry including subtle material changes", async () => {
    const c = chat();
    c.references = ["external-reference"];
    vi.mocked(checkEdit)
      .mockResolvedValueOnce({
        ok: false,
        problem: "incomplete colour change",
        instruction: "recolour every skin shade",
      })
      .mockResolvedValueOnce(null);
    await edit(c, { kind: "edit", request: "make skin blue" });
    expect(c.canvas.writeCels).toHaveBeenCalledTimes(1);
    expect(actions.redrawArea).toHaveBeenCalledWith(
      expect.any(String),
      "reference",
      4,
      4,
      ["external-reference"],
    );
    const cels = vi.mocked(c.canvas.writeCels).mock.calls[0]![1];
    expect(cels.get("frame")).toEqual(solid(110));
  });
});
