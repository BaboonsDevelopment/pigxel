import type { Area } from "@/features/editor/pixel-canvas/constants";
import { atLeastPlacementSize } from "@/features/editor/pixel-canvas/helpers";
import {
  generateImage,
  generateSet,
  planPlacement,
  suggestComposition,
} from "../../../actions";
import type { SetItem, TileAction } from "../../../types";
import { resizeNearest } from "@/lib/image/bitmap";
import { sheetToFrames } from "@/lib/image/sheet";
import {
  ASK_SELECT,
  UNREACHABLE,
  type Chat,
  type Placement,
} from "../constants";
import { copyObject, emptyCel, paint } from "../helpers";
import { toArt } from "./pictures";

const layerName = (action: TileAction) =>
  action.name?.trim() ||
  action.request.split(/[,.]/)[0]!.trim().slice(0, 30) ||
  "Picture";

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
  const result = await generateImage(
    subject,
    largest.w,
    largest.h,
    chat.references,
  ).catch(() => UNREACHABLE);
  if (result.ok) {
    const art = await toArt(result.value, largest);
    const size = canvas.size();
    const cel = areas.reduce(
      (pixels, area) =>
        paint(pixels, size, resizeNearest(art, area.w, area.h).rgba, area),
      emptyCel(size),
    );
    canvas.addLayer(name, cel, replace);
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
    references: chat.references,
  });
}

export async function generate(chat: Chat, action: TileAction) {
  const { canvas } = chat;
  const { request: subject, where = "", count = 1 } = action;
  const name = layerName(action);
  const size = canvas.size();
  if (action.items && action.items.length > 1)
    return drawSet(chat, action.items);
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
    const frame = canvas.frameId();
    const cel = canvas.readCel(original.layerId, frame);
    const copied = copyObject(cel, size, original.area, plan.value.areas);
    canvas.writeCels(original.layerId, new Map([[frame, copied]]));
    chat.say(`Added ${plan.value.areas.length} more like it.`);
  } else {
    await drawOnNewLayer(chat, subject, name, plan.value.areas);
  }
}

async function drawSet(chat: Chat, items: SetItem[]) {
  const { canvas } = chat;
  const size = canvas.size();
  const region = (!canvas.isEmpty() && canvas.freeArea()) || {
    x: 0,
    y: 0,
    ...size,
  };
  const cols = Math.min(
    items.length,
    Math.max(1, Math.round(Math.sqrt((items.length * region.w) / region.h))),
  );
  const rows = Math.ceil(items.length / cols);
  const cell = {
    w: Math.max(1, Math.floor(region.w / cols)),
    h: Math.max(1, Math.floor(region.h / rows)),
  };
  chat.setPending(true);
  const result = await generateSet({
    subjects: items.map((item) => item.subject),
    cellW: cell.w,
    cellH: cell.h,
  }).catch(() => UNREACHABLE);
  if (!result.ok) {
    chat.setError(result.error);
    chat.setPending(false);
    return false;
  }
  const { image, layout } = result.value;
  const pictures = await sheetToFrames(
    await (await fetch(image)).blob(),
    layout,
    items.length,
    cell,
  );
  const layers = items.flatMap((item, i) => {
    const art = pictures[i];
    if (!art) return [];
    const area = {
      x: region.x + (i % cols) * cell.w,
      y: region.y + Math.floor(i / cols) * cell.h,
      ...cell,
    };
    const name = item.name || item.subject.split(/[,.]/)[0]!.slice(0, 30);
    return [{ name, pixels: paint(emptyCel(size), size, art.rgba, area) }];
  });
  if (layers.length) canvas.addLayers(layers);
  const added = layers.map((l) => l.name);
  chat.setPending(false);
  if (!added.length) {
    chat.setError("Couldn’t cut the picture into its parts. Try again.");
    return false;
  }
  chat.append({
    role: "assistant",
    content: `Here they are, each on a layer of its own: ${added.map((n) => `"${n}"`).join(", ")}.`,
    image,
  });
  return true;
}
