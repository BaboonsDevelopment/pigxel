import {
  SNAPSHOT_BACKGROUND,
  type Area,
} from "@/components/pixel-canvas/constants";
import { canvasOf, tileSnapshot } from "@/components/pixel-canvas/helpers";
import { reviewEdit } from "@/lib/ai/actions";
import type { EditReview } from "@/lib/ai/types";
import { unionOf } from "@/lib/edit/raster";
import { REVIEW_MARGIN, type Chat } from "../constants";
import { grown } from "../helpers";

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
