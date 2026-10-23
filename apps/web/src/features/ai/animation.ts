import "server-only";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { bitmapToFrames } from "@/lib/image/sheet";
import { opaqueBox, type Bitmap } from "@/lib/image/bitmap";
import type { AnimationAnchor } from "@/lib/image/register-animation";
import { AiError } from "./errors";
import {
  buildEditReviewPrompt,
  buildSheetAnimatePrompt,
  buildSheetPrompt,
  sheetLayout,
} from "./helpers";
import type { AiProvider } from "./types";
import { padAnimationReference } from "./animation-reference";

export type AnimationInput = {
  subject: string;
  poses: string[];
  cellW: number;
  cellH: number;
  sheet: string | null;
  reference: string | null;
  composition?: "sprite" | "scene";
  style?: string;
  anchor?: AnimationAnchor;
};

const picture = (dataUrl: string) => ({
  mimeType: "image/png",
  base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
});

async function keepSheetDiagnostic(base64: string, detail: object) {
  if (process.env.NODE_ENV !== "development") return;
  try {
    const dir = join(process.cwd(), ".next", "cache", "ai-animation");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "latest-source.png"),
      Buffer.from(base64, "base64"),
    );
    await writeFile(join(dir, "latest.json"), JSON.stringify(detail, null, 2));
  } catch (e) {
    console.warn("[ai animation] Could not save diagnostic sheet:", e);
  }
}

async function decode(base64: string): Promise<Bitmap> {
  const { data, info } = await sharp(Buffer.from(base64, "base64"), {
    limitInputPixels: 16_777_216,
  })
    .resize({
      width: 2048,
      height: 2048,
      fit: "inside",
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, rgba: new Uint8ClampedArray(data) };
}

async function png(frame: Bitmap) {
  return sharp(Buffer.from(frame.rgba), {
    raw: { width: frame.w, height: frame.h, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function contact(
  frames: Bitmap[],
  layout: { cols: number; rows: number },
) {
  const { w, h } = frames[0]!;
  const input = await Promise.all(
    frames.map(async (frame, i) => ({
      input: await png(frame),
      left: (i % layout.cols) * w,
      top: Math.floor(i / layout.cols) * h,
    })),
  );
  return sharp({
    create: {
      width: w * layout.cols,
      height: h * layout.rows,
      channels: 4,
      background: { r: 255, g: 0, b: 255, alpha: 1 },
    },
  })
    .composite(input)
    .png()
    .toBuffer();
}

/** Generate, extract and review on the server before committing usage charges. */
export async function renderAnimation(ai: AiProvider, args: AnimationInput) {
  const layout = sheetLayout(args.poses.length, args.cellW, args.cellH);
  const prompt = args.sheet
    ? buildSheetAnimatePrompt({ ...args, layout })
    : buildSheetPrompt({ ...args, layout, fromReference: !!args.reference });
  const source = args.sheet ?? args.reference;
  const reference = source
    ? args.composition === "scene"
      ? picture(source)
      : await padAnimationReference(
          picture(source),
          args.sheet ? layout : { cols: 1, rows: 1 },
        )
    : null;
  const generated = reference
    ? await ai.redraw(prompt, reference, layout.aspectRatio, false)
    : await ai.generate(prompt, layout.aspectRatio, false);
  const diagnostic = {
    layout,
    count: args.poses.length,
    cellW: args.cellW,
    cellH: args.cellH,
    composition: args.composition,
  };
  await keepSheetDiagnostic(generated.base64, {
    ...diagnostic,
    stage: "generated",
  });

  let frames: Bitmap[];
  try {
    const extracted = bitmapToFrames(
      await decode(generated.base64),
      layout,
      args.poses.length,
      { w: args.cellW, h: args.cellH },
      args.composition === "scene" ? "cells" : "animation",
      args.composition === "scene",
      args.anchor,
    );
    if (
      extracted.length !== args.poses.length ||
      extracted.some((f) => !f || !opaqueBox(f))
    )
      throw new Error("Missing animation frames");
    frames = extracted as Bitmap[];
  } catch (error) {
    await keepSheetDiagnostic(generated.base64, {
      ...diagnostic,
      stage: "extraction",
      error: String(error),
    });
    console.warn("[ai animation] Frame extraction failed:", error);
    throw new AiError(
      "animation_invalid",
      "Could not extract complete animation frames",
    );
  }

  const final = await contact(frames, layout);
  const before =
    args.sheet && reference
      ? reference
      : {
          mimeType: "image/png",
          base64: (
            await contact(
              frames.map(() => frames[0]!),
              layout,
            )
          ).toString("base64"),
        };
  const review = await ai.reviewEdit(
    buildEditReviewPrompt(
      `Animation of ${args.subject}. Both images use ${layout.cols} columns by ${layout.rows} rows, in reading order. Consecutive poses: ${args.poses.map((p, i) => `${i + 1}: ${p}`).join("; ")}.`,
      "Accept intentional pose changes in sequence. Reject missing, unrelated or out-of-order poses, character redesign, lost details, unintended body drift or scale changes. Ignore unused trailing cells.",
    ),
    before,
    { mimeType: "image/png", base64: final.toString("base64") },
  );
  if (!review.ok) {
    await keepSheetDiagnostic(generated.base64, {
      ...diagnostic,
      stage: "review",
      error: review.problem,
    });
    console.warn("[ai animation] Consistency check failed:", review.problem);
    throw new AiError("animation_invalid", review.problem);
  }
  return {
    image: `data:${generated.mimeType};base64,${generated.base64}`,
    frames: frames.map((f) => Buffer.from(f.rgba).toString("base64")),
  };
}
