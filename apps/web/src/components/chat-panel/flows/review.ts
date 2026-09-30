import {
  SNAPSHOT_BACKGROUND,
  type Area,
} from "@/components/pixel-canvas/constants";
import { canvasOf, tileSnapshot } from "@/components/pixel-canvas/helpers";
import { reviewAnimation, reviewEdit } from "@/lib/ai/actions";
import type { AnimationFixes, AnimationPlan, EditReview } from "@/lib/ai/types";
import { unionOf } from "@/lib/edit/raster";
import type { Bitmap } from "@/lib/image/bitmap";
import {
  REVIEW_DIVIDER,
  REVIEW_FRAME_SIDE,
  REVIEW_MARGIN,
  type Chat,
} from "../constants";
import { frameStrip, grown } from "../helpers";

/**
 * A second look (free text model) at an edit or animation before it is
 * applied. A check that fails counts as "fine": it never blocks the result.
 */

/**
 * Checks one frame of an edit of a layer: its `source` and `target` areas
 * as the layer is now and in `after` (the new cel). The review when it found
 * a problem, else null.
 */
export async function checkEdit(
  chat: Chat,
  args: {
    request: string;
    instruction: string;
    layerId: string;
    frame: string;
    source: Area;
    target: Area;
    after: Uint8ClampedArray;
  },
): Promise<EditReview | null> {
  const { canvas } = chat;
  const size = canvas.size();
  const area = grown(unionOf([args.source, args.target])!, REVIEW_MARGIN, size);
  const result = await reviewEdit({
    request: args.request,
    instruction: args.instruction,
    before: canvas.snapshotCel(
      args.layerId,
      args.frame,
      area,
      SNAPSHOT_BACKGROUND,
    ),
    after: tileSnapshot(canvasOf(args.after, size), area),
  }).catch(() => null);
  return result?.ok && !result.value.ok ? result.value : null;
}

/**
 * Checks an animation's frames: `layers` are the new cels of each track, by
 * frame, in the plan's order. The fixes it found, or null.
 */
export async function checkAnimation(
  chat: Chat,
  request: string,
  plan: AnimationPlan,
  layers: (Uint8ClampedArray | null)[][],
): Promise<AnimationFixes | null> {
  const size = chat.canvas.size();
  const strip = frameStrip(layers, plan.frameCount, size, REVIEW_DIVIDER);
  const scale = Math.max(
    1,
    Math.floor(REVIEW_FRAME_SIDE / Math.max(size.w, size.h)),
  );
  const result = await reviewAnimation({
    request,
    plan,
    frames: enlarged(strip, scale),
    width: size.w,
    height: size.h,
  }).catch(() => null);
  return result?.ok && result.value.tracks.length ? result.value : null;
}

/** `image` enlarged `scale` times on the snapshot background, as a PNG data URL. */
function enlarged(image: Bitmap, scale: number): string {
  const out = document.createElement("canvas");
  out.width = image.w * scale;
  out.height = image.h * scale;
  const ctx = out.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = SNAPSHOT_BACKGROUND;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvasOf(image.rgba, image), 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}
