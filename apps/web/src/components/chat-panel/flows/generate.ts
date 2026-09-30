import type { Area } from "@/components/pixel-canvas/constants";
import { atLeastPlacementSize } from "@/components/pixel-canvas/helpers";
import {
  generateImage,
  planPlacement,
  suggestComposition,
} from "@/lib/ai/actions";
import type { TileAction } from "@/lib/ai/types";
import { resizeNearest } from "@/lib/image/bitmap";
import {
  ASK_SELECT,
  UNREACHABLE,
  type Chat,
  type Placement,
} from "../constants";
import { copyObject, drawnBox, emptyCel, paint, toArt } from "../helpers";

/** The name for a new picture's layer: the router's, or the subject's start. */
const layerName = (action: TileAction) =>
  action.name?.trim() ||
  action.request.split(/[,.]/)[0]!.trim().slice(0, 30) ||
  "Picture";

/**
 * Draws `subject` once, puts it into every area (only on empty pixels) of a
 * new layer called `name`, and says so. With `replace`, the other drawing
 * layers are hidden, so it takes their place. False when it failed.
 */
export async function drawOnNewLayer(
  chat: Chat,
  subject: string,
  name: string,
  areas: Area[],
  replace = false,
) {
  const { canvas } = chat;
  const largest = areas.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
  chat.setPending(true);
  const result = await generateImage(subject, largest.w, largest.h).catch(
    () => UNREACHABLE,
  );
  if (result.ok) {
    const art = await toArt(result.value, largest);
    const size = canvas.size();
    const cel = areas.reduce(
      (pixels, area) =>
        paint(pixels, size, resizeNearest(art, area.w, area.h).rgba, area),
      emptyCel(size),
    );
    const layerId = canvas.addLayer(name, cel, replace);
    // One picture in one place: later edits can start from it.
    if (areas.length === 1)
      chat.sources.set(layerId, {
        image: result.value,
        area: largest,
        box: drawnBox(cel, size),
      });
    const many = areas.length > 1 ? ` ×${areas.length}` : "";
    const hidden = replace
      ? " The other layers are hidden, not deleted: show them again in the timeline."
      : "";
    chat.append({
      role: "assistant",
      content: `Here is your picture: ${subject}${many}, on the layer "${name}".${hidden}`,
      image: result.value,
    });
  } else {
    chat.setError(result.error);
  }
  chat.setPending(false);
  return result.ok;
}

/** The tile has art on it: offer the whole tile, free space, or blending in. */
async function offerPlacements(chat: Chat, action: TileAction) {
  const { canvas } = chat;
  chat.setPending(true);
  const size = canvas.size();
  const tile = { x: 0, y: 0, ...size };
  const placements: Placement[] = [
    { kind: "replace", label: "Replace what’s drawn", area: tile },
  ];
  const free = canvas.freeArea();
  if (free)
    placements.push({
      kind: "free",
      label: "Put it in free space",
      area: free,
    });
  const composed = await suggestComposition(
    action.request,
    canvas.snapshot(),
    size.w,
    size.h,
  ).catch(() => UNREACHABLE);
  if (composed.ok) {
    placements.push({
      kind: "compose",
      label: "Blend into the scene",
      area: atLeastPlacementSize(composed.value, tile),
    });
  }
  chat.setPending(false);
  chat.append({
    role: "assistant",
    content: "There is already something on the tile. How should I add it?",
    action: { ...action, name: layerName(action) },
    placements,
  });
}

/**
 * New pictures, each request on a layer of its own. On a tile with drawings
 * the placement planner finds free spots that follow what the user said (or
 * copies an existing object on its own layer when they asked for more of
 * it); the user chooses only when there is no room without covering art.
 */
export async function generate(chat: Chat, action: TileAction) {
  const { canvas } = chat;
  const { request: subject, where = "", count = 1 } = action;
  const name = layerName(action);
  const size = canvas.size();
  if (chat.selectArea) {
    chat.say(ASK_SELECT);
    const area = await canvas.selectArea();
    if (area) await drawOnNewLayer(chat, subject, name, [area]);
    else chat.say("No area selected, so nothing was drawn.");
    return;
  }
  if (canvas.isEmpty() && count === 1 && !where) {
    await drawOnNewLayer(chat, subject, name, [{ x: 0, y: 0, ...size }]);
    return;
  }

  chat.setPending(true);
  const objects = canvas.objects();
  const names = new Map(canvas.layers().map((l) => [l.id, l.name]));
  const plan = await planPlacement({
    subject,
    where,
    count,
    tile: canvas.snapshot(),
    width: size.w,
    height: size.h,
    objects: objects.map((o) => o.area),
    layers: objects.map((o) => names.get(o.layerId) ?? ""),
    recent: chat.messages.map(({ role, content }) => ({ role, content })),
  }).catch(() => UNREACHABLE);
  chat.setPending(false);

  const blocked =
    !plan.ok ||
    plan.value.ask ||
    plan.value.areas.some((a) => canvas.overlapsDrawing(a));
  const original = plan.ok ? objects[plan.value.copyOf ?? -1] : undefined;
  if (blocked) {
    if (plan.ok && plan.value.question) chat.say(plan.value.question);
    await offerPlacements(chat, action);
  } else if (original) {
    // More of something drawn: copies go on the layer of the original.
    const frame = canvas.frameId();
    const cel = canvas.readCel(original.layerId, frame);
    const copied = copyObject(cel, size, original.area, plan.value.areas);
    canvas.writeCels(original.layerId, new Map([[frame, copied]]));
    chat.say(`Added ${plan.value.areas.length} more like it.`);
  } else {
    await drawOnNewLayer(chat, subject, name, plan.value.areas);
  }
}
