import type { Area } from "@/components/pixel-canvas/constants";
import { editTile, planEdit, redrawArea } from "@/lib/ai/actions";
import type { EditPlan, TileAction } from "@/lib/ai/types";
import { encodeTile } from "@/lib/edit/codec";
import { EDIT_MARGIN } from "@/lib/edit/constants";
import { paintedBounds, sameRect, unionOf } from "@/lib/edit/raster";
import { CHROMA_KEY_HEX } from "@/lib/image/constants";
import {
  ASK_FRAME,
  ASK_SELECT,
  NO_LAYER,
  UNREACHABLE,
  type Chat,
} from "../constants";
import {
  applyEdit,
  applyRedraw,
  follow,
  moveObject,
  replaceObject,
  samePixels,
} from "../helpers";
import { toArt } from "./pictures";

/** New cels by frame id, written back as one undo step. */
type Cels = Map<string, Uint8ClampedArray>;

/**
 * One frame's part of an edit: where it happens there. The plan was made on
 * the frame on screen; in other frames the drawing may sit elsewhere, so
 * there the edit covers all of it and follows the planned move or resize.
 */
type Step = { frame: string; source: Area; target: Area; keep: Area[] };

/**
 * Any change to what is drawn. The planner looks at the tile and decides what
 * changes, where the result goes and how; the change happens on the layer of
 * what it changes, in every frame that layer has something in. A move or
 * resize is shown as a frame first, so the user confirms it; redrawing more
 * than one frame (paid per frame) waits for a click.
 */
export async function edit(chat: Chat, action: TileAction) {
  const { canvas } = chat;
  if (chat.selectArea) chat.say(ASK_SELECT);
  const selection = chat.selectArea ? await canvas.selectArea() : null;
  if (chat.selectArea && !selection)
    return chat.say("No area selected, so nothing changed.");

  chat.setPending(true);
  const size = canvas.size();
  const tile = { x: 0, y: 0, ...size };
  const layers = canvas.layers();
  const objects = canvas.objects();
  const names = new Map(layers.map((l) => [l.id, l.name]));
  const plan = await planEdit({
    request: action.request,
    tile: canvas.snapshot(),
    width: size.w,
    height: size.h,
    objects: objects.map((o) => o.area),
    layers: objects.map((o) => names.get(o.layerId) ?? ""),
    drawn: unionOf(layers.flatMap((l) => (l.box ? [l.box] : []))) ?? tile,
    selection,
  }).catch(() => UNREACHABLE);
  chat.setPending(false);
  if (!plan.ok) return chat.setError(plan.error);

  const layerId =
    objects[plan.value.objects[0] ?? -1]?.layerId ?? canvas.activeLayer();
  if (!layers.find((l) => l.id === layerId)?.editable)
    return chat.say(NO_LAYER);

  const { source } = plan.value;
  let target = plan.value.target;
  if (!sameRect(source, target)) {
    chat.say(plan.value.question || ASK_FRAME);
    const adjusted = await canvas.adjustArea(target);
    if (!adjusted) return chat.say("Cancelled, nothing changed.");
    target = adjusted;
  }

  const current = canvas.frameId();
  const frames = canvas.framesOf(layerId);
  const steps: Step[] = (frames.length ? frames : [current]).map((frame) => {
    if (frame === current)
      return { frame, source, target, keep: plan.value.keep };
    const cel = canvas.readCel(layerId, frame);
    const drawn = paintedBounds(cel, size.w, tile, EDIT_MARGIN);
    return {
      frame,
      source: drawn,
      target: follow(drawn, source, target, size),
      keep: [],
    };
  });

  /** Writes the new cels back and says what was done; false when it failed. */
  const done = (cels: Cels | null, image?: string) => {
    if (!cels) return false;
    const same = [...cels].every(([frame, cel]) =>
      samePixels(cel, canvas.readCel(layerId, frame)),
    );
    // Say so honestly rather than report an edit nobody can see.
    if (same) {
      chat.say(
        "Nothing on the tile changed. Try saying exactly what to change.",
      );
      return false;
    }
    canvas.writeCels(layerId, cels);
    const many = steps.length > 1 ? ` (${steps.length} frames)` : "";
    const content = (plan.value.summary || "Done.") + many;
    chat.append({ role: "assistant", content, image });
    return true;
  };
  const redrawn = async () => {
    const result = await redraw(chat, layerId, plan.value, steps);
    return done(result?.cels ?? null, result?.image);
  };

  if (plan.value.mode === "redraw" && steps.length > 1) {
    chat.append({
      role: "assistant",
      content: `This changes ${steps.length} frames of the layer "${names.get(layerId)}", one picture each.`,
      button: {
        label: `Redraw ${steps.length} frames`,
        run: redrawn,
      },
    });
    return;
  }
  chat.setPending(true);
  if (plan.value.mode === "ops")
    done(await editPixels(chat, layerId, plan.value, steps));
  else if (plan.value.mode === "move") done(move(chat, layerId, steps));
  else await redrawn();
  chat.setPending(false);
}

/** Exact pixel operations in each frame (free); null when one failed. */
async function editPixels(
  chat: Chat,
  layerId: string,
  plan: EditPlan,
  steps: Step[],
): Promise<Cels | null> {
  const { canvas } = chat;
  const size = canvas.size();
  const cels: Cels = new Map();
  let applied = 0;
  for (const step of steps) {
    const cel = canvas.readCel(layerId, step.frame);
    const grid = encodeTile(cel, size.w, size.h, step.source);
    const result = await editTile(plan.instruction, grid.text).catch(
      () => UNREACHABLE,
    );
    if (!result.ok) {
      chat.setError(result.error);
      return null;
    }
    const edited = applyEdit(
      cel,
      size,
      { ops: result.value.ops, palette: grid.palette },
      step.source,
      step.keep,
    );
    cels.set(step.frame, edited.cel);
    applied += edited.applied;
  }
  if (!applied) {
    chat.say("Nothing on the tile changed.");
    return null;
  }
  return cels;
}

/** The drawing moved pixel for pixel in each frame (free). */
function move(chat: Chat, layerId: string, steps: Step[]): Cels {
  const { canvas } = chat;
  const size = canvas.size();
  return new Map(
    steps.map((step) => [
      step.frame,
      moveObject(
        canvas.readCel(layerId, step.frame),
        size,
        step.source,
        step.target,
      ),
    ]),
  );
}

/**
 * The image model redraws each frame's part (paid), all at once; the new
 * cels and the first picture, or null when one failed.
 */
async function redraw(
  chat: Chat,
  layerId: string,
  plan: EditPlan,
  steps: Step[],
): Promise<{ cels: Cels; image: string } | null> {
  const { canvas } = chat;
  const size = canvas.size();
  chat.setPending(true);
  const results = await Promise.all(
    steps.map((step) =>
      redrawArea(
        plan.instruction,
        canvas.snapshotCel(layerId, step.frame, step.source, CHROMA_KEY_HEX),
        step.target.w,
        step.target.h,
      ).catch(() => UNREACHABLE),
    ),
  );
  chat.setPending(false);
  const pictures: string[] = [];
  for (const result of results) {
    if (!result.ok) {
      chat.setError(result.error);
      return null;
    }
    pictures.push(result.value);
  }
  const cels: Cels = new Map();
  for (const [i, step] of steps.entries()) {
    const art = await toArt(pictures[i]!, step.target);
    const cel = canvas.readCel(layerId, step.frame);
    cels.set(
      step.frame,
      sameRect(step.source, step.target)
        ? applyRedraw(cel, size, art, step.target, step.keep)
        : replaceObject(cel, size, art, step.source, step.target),
    );
  }
  return { cels, image: pictures[0]! };
}
