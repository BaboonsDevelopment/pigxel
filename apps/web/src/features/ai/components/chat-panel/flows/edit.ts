import type { Area } from "@/features/editor/pixel-canvas/constants";
import { planEdit, redrawArea, redrawFrames } from "../../../actions";
import { toPictures } from "../../../pictures";
import { sheetLayout } from "../../../helpers";
import type { EditPlan, TileAction } from "../../../types";
import { EDIT_MARGIN } from "@/lib/edit/constants";
import { paintedBounds, sameRect, unionOf } from "@/lib/edit/raster";
import { CHROMA_KEY_HEX } from "@/lib/image/constants";
import {
  REDRAWN_PICTURE_STEPS,
  SCENE_PICTURE_STEPS,
} from "@/lib/image/pipeline";
import { sheetToFrames } from "@/lib/image/sheet";
import {
  ASK_FRAME,
  ASK_SELECT,
  NO_LAYER,
  unreachable,
  type Chat,
} from "../constants";
import {
  applyRedraw,
  follow,
  replaceArea,
  replaceObject,
  samePixels,
} from "../helpers";
import { framesSheet, toArt, toReference } from "./pictures";

type Cels = Map<string, Uint8ClampedArray>;

type Step = { frame: string; source: Area; target: Area; keep: Area[] };

const covers = (outer: Area, inner: Area) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h;

async function originalOf(chat: Chat, layerId: string): Promise<string> {
  const image = [...chat.messages]
    .reverse()
    .find((m) => m.layer === layerId)?.image;
  if (!image) return "";
  const blob = await (await fetch(image)).blob();
  return (await toReference(blob).catch(() => null)) ?? "";
}

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
    references: toPictures(chat.references),
    style: action.style,
    composition: action.composition,
    recent: chat.messages.map(({ role, content, action: previousAction }) => ({
      role,
      content,
      action: previousAction,
    })),
  }).catch(unreachable);
  chat.setPending(false);
  if (!plan.ok) return chat.setError(plan.error);

  const layerId =
    objects[plan.value.objects[0] ?? -1]?.layerId ?? canvas.activeLayer();
  const layer = layers.find((l) => l.id === layerId);
  if (!layer?.editable) return chat.say(NO_LAYER);

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
    if (frame === current || action.composition === "scene")
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
  const whole = !!layer.box && covers(source, layer.box);

  const run = async () => {
    chat.setPending(true);
    try {
      const original = whole ? await originalOf(chat, layerId) : "";
      const made = await redraw(
        chat,
        layerId,
        plan.value,
        steps,
        original,
        action.composition,
      );
      if (!made) return false;
      const same = [...made.cels].every(([frame, cel]) =>
        samePixels(cel, canvas.readCel(layerId, frame)),
      );
      if (same) {
        chat.say(
          "Nothing on the tile changed. Try saying exactly what to change.",
        );
        return false;
      }
      canvas.writeCels(layerId, made.cels);
      const many = steps.length > 1 ? ` (${steps.length} frames)` : "";
      chat.append({
        role: "assistant",
        content:
          (action.composition === "scene"
            ? "Here is the redrawn scene."
            : plan.value.summary || "Done.") + many,
        image: made.image,
        ...(whole && steps.length === 1 && { layer: layerId }),
      });
      return true;
    } catch {
      chat.setError("Couldn’t redraw the picture. Try again.");
      return false;
    } finally {
      chat.setPending(false);
    }
  };

  if (steps.length > 1 && !redrawnTogether(steps)) {
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

const redrawnTogether = (steps: Step[]) =>
  steps.length > 1 && steps.every((s) => sameRect(s.source, s.target));

async function redraw(
  chat: Chat,
  layerId: string,
  plan: EditPlan,
  steps: Step[],
  original: string,
  composition: "sprite" | "scene" = "sprite",
): Promise<{ cels: Cels; image: string } | null> {
  if (redrawnTogether(steps))
    return redrawFramesTogether(
      chat,
      layerId,
      plan,
      steps,
      original,
      composition,
    );
  const { canvas } = chat;
  const size = canvas.size();
  const current = canvas.frameId();
  const results = await Promise.all(
    steps.map((step) =>
      redrawArea({
        request: plan.instruction,
        picture: canvas.snapshotCel(
          layerId,
          step.frame,
          step.source,
          CHROMA_KEY_HEX,
        ),
        width: step.target.w,
        height: step.target.h,
        references: toPictures(chat.references),
        original: step.frame === current ? original : "",
        composition,
      }).catch(unreachable),
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
    const art = await toArt(
      pictures[i]!,
      step.target,
      composition === "scene" ? SCENE_PICTURE_STEPS : REDRAWN_PICTURE_STEPS,
    );
    const cel = canvas.readCel(layerId, step.frame);
    cels.set(
      step.frame,
      composition === "scene"
        ? replaceArea(cel, size, art, step.target)
        : sameRect(step.source, step.target)
          ? applyRedraw(cel, size, art, step.target, step.keep)
          : replaceObject(cel, size, art, step.source, step.target),
    );
  }
  return { cels, image: pictures[0]! };
}

async function redrawFramesTogether(
  chat: Chat,
  layerId: string,
  plan: EditPlan,
  steps: Step[],
  original: string,
  composition: "sprite" | "scene",
): Promise<{ cels: Cels; image: string } | null> {
  const { canvas } = chat;
  const size = canvas.size();
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
    references: toPictures(chat.references),
    original,
    composition,
  }).catch(unreachable);
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
    "cells",
    composition === "scene",
  );
  if (!frames.every(Boolean)) {
    chat.setError("Couldn’t cut the redrawn frames apart. Try again.");
    return null;
  }
  const cels: Cels = new Map();
  for (const [i, step] of steps.entries())
    cels.set(
      step.frame,
      composition === "scene"
        ? replaceArea(before[i]!, size, frames[i]!, box)
        : applyRedraw(before[i]!, size, frames[i]!, box, step.keep),
    );
  return { cels, image };
}
