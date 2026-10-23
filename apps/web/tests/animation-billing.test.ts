import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { supabase } from "@test/supabase";
import { generateAnimation } from "@/features/ai/actions";
import { billOnSuccess, recordUsage } from "@/features/ai/usage";
import { sheetLayout } from "@/features/ai/helpers";
import type { AiProvider } from "@/features/ai/types";

vi.mock(
  "@/lib/supabase/server",
  async () => (await import("@test/supabase")).supabaseModules.server,
);
vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ id: "test-user" }),
}));
vi.mock("@/features/ai/credits", () => ({
  creditBalance: async () => ({ limit: 1000, left: 1000 }),
  creditsOf: (n: number) => n * 1000,
}));
vi.mock("@/features/ai/moderation", () => ({ moderate: async () => {} }));
vi.mock("@/features/ai/provider", () => ({ getAiProvider: () => provider }));

let generated = "";
let accepted = true;
const provider = {
  generate: vi.fn(async () => {
    await recordUsage("generate", "gemini-2.5-flash-image", {
      candidatesTokenCount: 100,
    });
    return { mimeType: "image/png", base64: generated };
  }),
  redraw: vi.fn(async () => {
    await recordUsage("redraw", "gemini-2.5-flash-image", {
      candidatesTokenCount: 100,
    });
    return { mimeType: "image/png", base64: generated };
  }),
  reviewEdit: vi.fn(async () => {
    await recordUsage("reviewEdit", "gemini-3.1-flash-lite", {
      candidatesTokenCount: 10,
    });
    return {
      ok: accepted,
      problem: accepted ? "" : "Unrelated poses",
      instruction: "",
    };
  }),
} as unknown as AiProvider;

async function sheet(missing = false) {
  const cols = sheetLayout(6, 32, 32).cols === 2 ? 3 : 2;
  const w = cols * 32,
    h = (6 / cols) * 32;
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < (missing ? 5 : 6); i++)
    for (let y = 10; y < 27; y++)
      for (let x = 7; x < 24; x++) {
        const at =
          ((Math.floor(i / cols) * 32 + y) * w + (i % cols) * 32 + x) * 4;
        rgba.set([50 + i * 25, 80, 40, 255], at);
      }
  return (
    await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
      .png()
      .toBuffer()
  ).toString("base64");
}
const args = {
  subject: "a barking corgi",
  poses: Array.from({ length: 6 }, (_, i) => `pose ${i + 1}`),
  cellW: 32,
  cellH: 32,
  sheet: null,
  reference: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  accepted = true;
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("animation extraction and billing", () => {
  it("sends a reference with physical gutters and compares against that same padded reference", async () => {
    generated = await sheet();
    const reference = await sharp({
      create: { width: 64, height: 96, channels: 4, background: "#aa5522" },
    })
      .png()
      .toBuffer();
    const result = await generateAnimation({
      ...args,
      sheet: `data:image/png;base64,${reference.toString("base64")}`,
    });
    expect(result.ok).toBe(true);
    const actual = vi.mocked(provider.redraw).mock.calls[0]![1];
    const { data, info } = await sharp(Buffer.from(actual.base64, "base64"))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect([...data.subarray(0, 4)]).toEqual([255, 0, 255, 255]);
    expect(info.width).toBeGreaterThanOrEqual(128);
    expect(vi.mocked(provider.redraw).mock.calls[0]![0]).toContain(
      "at least 15 pixels",
    );
    expect(vi.mocked(provider.reviewEdit).mock.calls[0]![1]).toEqual(actual);
  });
  it("recovers a transposed grid, returns six ready frames and bills only after review", async () => {
    generated = await sheet();
    vi.mocked(provider.reviewEdit).mockImplementationOnce(async () => {
      expect(supabase.callsTo("ai_usage.insert")).toHaveLength(0);
      await recordUsage("reviewEdit", "gemini-3.1-flash-lite", {
        candidatesTokenCount: 10,
      });
      return { ok: true, problem: "", instruction: "" };
    });
    const result = await generateAnimation(args);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.frames).toHaveLength(6);
    expect(
      result.value.frames.every(
        (f) => Buffer.from(f, "base64").length === 32 * 32 * 4,
      ),
    ).toBe(true);
    expect(supabase.callsTo("ai_usage.insert")).toHaveLength(1);
    expect(supabase.callsTo("ai_usage.insert")[0]).toMatchObject({
      values: [{ step: "generate" }, { step: "reviewEdit" }],
    });
  });
  it("does not bill or fabricate a replacement for a missing pose", async () => {
    generated = await sheet(true);
    const result = await generateAnimation(args);
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining(
        "No tokens were charged for this generation",
      ),
    });
    expect(provider.reviewEdit).not.toHaveBeenCalled();
    expect(supabase.callsTo("ai_usage.insert")).toHaveLength(0);
  });
  it("discards both generation and review charges when poses are inconsistent", async () => {
    generated = await sheet();
    accepted = false;
    expect(await generateAnimation(args)).toMatchObject({ ok: false });
    expect(provider.reviewEdit).toHaveBeenCalledTimes(1);
    expect(supabase.callsTo("ai_usage.insert")).toHaveLength(0);
  });
  it("does not charge for corrupt image data or a failed consistency service", async () => {
    generated = "not-an-image";
    expect(await generateAnimation(args)).toMatchObject({ ok: false });
    generated = await sheet();
    vi.mocked(provider.reviewEdit).mockRejectedValueOnce(
      new Error("service unavailable"),
    );
    expect(await generateAnimation(args)).toMatchObject({ ok: false });
    expect(supabase.callsTo("ai_usage.insert")).toHaveLength(0);
  });
  it("rejects invalid input before calling the provider", async () => {
    expect(await generateAnimation({ ...args, cellW: 0 })).toMatchObject({
      ok: false,
    });
    expect(provider.generate).not.toHaveBeenCalled();
    expect(supabase.callsTo("ai_usage.insert")).toHaveLength(0);
  });
  it("isolates simultaneous successful and failed requests", async () => {
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    const failed = billOnSuccess(async () => {
      await recordUsage("failed", "gemini-2.5-flash-image", {
        candidatesTokenCount: 100,
      });
      await ready;
      throw new Error("bad sheet");
    });
    const success = billOnSuccess(async () => {
      await recordUsage("successful", "gemini-2.5-flash-image", {
        candidatesTokenCount: 100,
      });
      release();
      return "done";
    });
    expect(await Promise.allSettled([failed, success])).toMatchObject([
      { status: "rejected" },
      { status: "fulfilled", value: "done" },
    ]);
    expect(supabase.callsTo("ai_usage.insert")).toMatchObject([
      { values: { step: "successful" } },
    ]);
  });
});
