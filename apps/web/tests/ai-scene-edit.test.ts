import { beforeEach, describe, expect, it, vi } from "vitest";
import { planEdit, redrawArea } from "@/features/ai/actions";
import { toPictures } from "@/features/ai/pictures";
import type { AiProvider, PlanReply } from "@/features/ai/types";

vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ id: "test-user" }),
}));
vi.mock("@/features/ai/credits", () => ({
  creditBalance: async () => ({ limit: 1000, left: 1000 }),
}));
vi.mock("@/features/ai/moderation", () => ({ moderate: async () => {} }));
vi.mock("@/features/ai/provider", () => ({ getAiProvider: () => provider }));

const portrait = { x: 16, y: 0, w: 32, h: 64 };
const tile = { x: 0, y: 0, w: 64, h: 64 };
const reply: PlanReply = {
  objects: [],
  keep: [0],
  target: portrait,
  instruction: "Add a landscape behind the portrait",
  summary: "Added background",
  question: "",
};
const provider = {
  plan: vi.fn(async () => reply),
  redraw: vi.fn(async () => ({ mimeType: "image/png", base64: "YWJj" })),
  generate: vi.fn(async () => ({ mimeType: "image/png", base64: "YWJj" })),
} as unknown as AiProvider;
const args = {
  request: "background should be like Mona Lisa",
  tile: "data:image/png;base64,YWJj",
  width: 64,
  height: 64,
  objects: [portrait],
  layers: ["Portrait"],
  drawn: portrait,
  selection: null,
};

beforeEach(() => vi.clearAllMocks());

describe("scene edit canvas", () => {
  it("uses the full tile instead of the character bounds and removes an all-scene keep mask", async () => {
    const result = await planEdit({ ...args, composition: "scene" });
    expect(result).toMatchObject({
      ok: true,
      value: { source: tile, target: tile, keep: [] },
    });
    expect(provider.plan).toHaveBeenCalledWith(
      expect.stringContaining("x 0, y 0, w 64, h 64"),
      expect.any(Array),
    );
  });
  it("honours an explicit selection for a scene edit", async () => {
    const selection = { x: 0, y: 12, w: 64, h: 20 };
    const result = await planEdit({ ...args, selection, composition: "scene" });
    expect(result).toMatchObject({
      ok: true,
      value: { source: selection, target: selection, keep: [] },
    });
  });
  it("passes the unresolved raw background request through planning and into the redraw instruction", async () => {
    const request = "make there also";
    const earlier =
      "extend the floor into the black lower corners; fill the whole tile";
    const result = await planEdit({
      ...args,
      request,
      composition: "scene",
      recent: [
        { role: "user", content: earlier },
        { role: "assistant", content: "All borders have been removed" },
        { role: "user", content: request },
      ],
    });
    expect(provider.plan).toHaveBeenCalledWith(
      expect.stringContaining(earlier),
      expect.any(Array),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.instruction).toContain(earlier);
    expect(result.value.instruction).not.toContain(
      "All borders have been removed",
    );
    await redrawArea({
      request: result.value.instruction,
      picture: args.tile,
      width: 64,
      height: 64,
      composition: "scene",
    });
    expect(provider.redraw).toHaveBeenCalledWith(
      expect.stringContaining(earlier),
      expect.any(Object),
      "1:1",
      true,
    );
  });
  it("preserves wrapped user references and the original while redrawing a complete scene", async () => {
    const reference = "data:image/png;base64,ZGVm";
    const original = "data:image/png;base64,Z2hp";
    const references = toPictures([reference]);
    const plan = await planEdit({ ...args, references, composition: "scene" });
    expect(plan).toMatchObject({
      ok: true,
      value: { source: tile, target: tile },
    });
    expect(provider.plan).toHaveBeenCalledWith(expect.any(String), [
      { mimeType: "image/png", base64: "YWJj" },
      { mimeType: "image/png", base64: "ZGVm" },
    ]);
    const result = await redrawArea({
      request: args.request,
      picture: args.tile,
      width: 64,
      height: 64,
      references,
      original,
      composition: "scene",
    });
    expect(result.ok).toBe(true);
    expect(provider.generate).toHaveBeenCalledWith(
      expect.stringContaining("across the ENTIRE canvas"),
      "1:1",
      true,
      [
        { mimeType: "image/png", base64: "YWJj" },
        { mimeType: "image/png", base64: "Z2hp" },
        { mimeType: "image/png", base64: "ZGVm" },
      ],
    );
  });
  it("keeps object bounds and protection for ordinary sprite edits", async () => {
    const result = await planEdit(args);
    expect(result).toMatchObject({
      ok: true,
      value: { source: portrait, target: portrait, keep: [portrait] },
    });
  });
  it("passes canvas dimensions, aspect ratio and full-background instructions to the image model", async () => {
    const result = await redrawArea({
      request: args.request,
      picture: args.tile,
      width: 64,
      height: 64,
      composition: "scene",
    });
    expect(result.ok).toBe(true);
    expect(provider.redraw).toHaveBeenCalledWith(
      expect.stringContaining("fixed 64x64 canvas"),
      expect.objectContaining({ mimeType: "image/png" }),
      "1:1",
      true,
    );
    expect(vi.mocked(provider.redraw).mock.calls[0]![0]).toContain(
      "across the ENTIRE canvas",
    );
    expect(vi.mocked(provider.redraw).mock.calls[0]![0]).not.toContain(
      "stay flat",
    );
  });
});
