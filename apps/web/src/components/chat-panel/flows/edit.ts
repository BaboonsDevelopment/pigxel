import type { Area } from "@/components/pixel-canvas/constants";
import { editTile, planEdit, redrawArea, redrawFrames } from "@/lib/ai/actions";
import { sheetLayout } from "@/lib/ai/helpers";
import type { EditPlan, TileAction } from "@/lib/ai/types";
import { encodeTile } from "@/lib/edit/codec";
import { EDIT_MARGIN } from "@/lib/edit/constants";
import { paintedBounds, sameRect, unionOf } from "@/lib/edit/raster";
import { CHROMA_KEY_HEX } from "@/lib/image/constants";
import { REDRAWN_PICTURE_STEPS } from "@/lib/image/pipeline";
import { sheetToFrames } from "@/lib/image/sheet";
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
import { framesSheet, toArt } from "./pictures";
import { checkEdit } from "./review";

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
  const done = ({ cels, image, fixed }: Made) => {
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
    const content =
      (plan.value.summary || "Done.") +
      many +
      (fixed ? `\nChecked and fixed: ${fixed}` : "");
    chat.append({ role: "assistant", content, image });
    return true;
  };

  /** The edit made with `instruction` in every frame. */
  const make = async (instruction: string): Promise<Made> => {
    const edit = { ...plan.value, instruction };
    if (edit.mode === "ops")
      return { cels: await editPixels(chat, layerId, edit, steps) };
    if (edit.mode === "move") return { cels: move(chat, layerId, steps) };
    return (await redraw(chat, layerId, edit, steps)) ?? { cels: null };
  };

  /**
   * Makes the edit, has the frame on screen checked and, when the check
   * finds a problem, makes it once more with a better instruction (that one
   * is not checked again). A move copies pixels exactly, and a redraw of
   * several frames is paid per frame, so neither is made twice.
   */
  const run = async () => {
    chat.setPending(true);
    const made = await make(plan.value.instruction);
    const step = steps.find((s) => s.frame === current) ?? steps[0]!;
    const after = made.cels?.get(step.frame);
    const again =
      plan.value.mode === "ops" ||
      (plan.value.mode === "redraw" && steps.length === 1);
    const review =
      after && again
        ? await checkEdit(chat, {
            request: action.request,
            instruction: plan.value.instruction,
            layerId,
            frame: step.frame,
            source: step.source,
            target: step.target,
            after,
          })
        : null;
    const remade = review ? await make(review.instruction) : null;
    chat.setPending(false);
    return done(
      remade?.cels
        ? { ...remade, fixed: review!.problem || "the result looked wrong." }
        : made,
    );
  };

  // Frames redrawn one picture each (only when the drawing moves or
  // resizes) cost one picture per frame, so that waits for a click.
  if (
    plan.value.mode === "redraw" &&
    steps.length > 1 &&
    !redrawnTogether(steps)
  ) {
    chat.append({
      role: "assistant",
      content: `This changes ${steps.length} frames of the layer "${names.get(layerId)}", one picture each.`,
      button: {
        label: `Redraw ${steps.length} frames`,
        run,
      },
    });
    return;
  }
  await run();
}

/** An edit made in every frame (null cels when it failed). */
type Made = { cels: Cels | null; image?: string; fixed?: string };

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
 * Whether every frame is redrawn in one picture: when there are several and
 * the drawing stays where it is in each.
 */
const redrawnTogether = (steps: Step[]) =>
  steps.length > 1 && steps.every((s) => sameRect(s.source, s.target));

/**
 * The image model redraws the edited part (paid): every frame in one picture
 * when it can (see redrawnTogether), so the change looks the same in all of
 * them; else each frame's part, all at once. The new cels and the first
 * picture, or null when it failed.
 */
async function redraw(
  chat: Chat,
  layerId: string,
  plan: EditPlan,
  steps: Step[],
): Promise<{ cels: Cels; image: string } | null> {
  if (redrawnTogether(steps))
    return redrawFramesTogether(chat, layerId, plan, steps);
  const { canvas } = chat;
  const size = canvas.size();
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
    const art = await toArt(pictures[i]!, step.target, REDRAWN_PICTURE_STEPS);
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

/**
 * Every frame's part sent as one sprite sheet and redrawn as one picture
 * (paid once), then cut back into frames: the changed thing looks the same
 * in all of them. The new cels and the picture, or null when it failed.
 */
async function redrawFramesTogether(
  chat: Chat,
  layerId: string,
  plan: EditPlan,
  steps: Step[],
): Promise<{ cels: Cels; image: string } | null> {
  const { canvas } = chat;
  const size = canvas.size();
  // One box for all frames, so they share a cell size and stay in place.
  const box = unionOf(steps.map((s) => s.source))!;
  const before = steps.map((s) => canvas.readCel(layerId, s.frame));
  const result = await redrawFrames({
    instruction: plan.instruction,
    sheet: framesSheet(
      before,
      size,
      box,
      sheetLayout(steps.length, box.w, box.h),
    ),
    count: steps.length,
    cellW: box.w,
    cellH: box.h,
  }).catch(() => UNREACHABLE);
  if (!result.ok) {
    chat.setError(result.error);
    return null;
  }
  const { image, layout } = result.value;
  const frames = await sheetToFrames(
    await (await fetch(image)).blob(),
    layout,
    steps.length,
    box,
  );
  if (!frames.every(Boolean)) {
    chat.setError("Couldn’t cut the redrawn frames apart. Try again.");
    return null;
  }
  const cels: Cels = new Map();
  for (const [i, step] of steps.entries())
    cels.set(
      step.frame,
      applyRedraw(before[i]!, size, frames[i]!, box, step.keep),
    );
  return { cels, image };
}
