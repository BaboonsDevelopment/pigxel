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

/**
 * A second look (text model) at an edit before it is
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
