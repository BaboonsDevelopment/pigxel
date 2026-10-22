import type { AnimationSpec } from "@/features/editor/pixel-canvas/use-sprite";
import {
  animateSheet,
  generateSheet,
  planAnimation,
  reviewEdit,
} from "../../../actions";
import { sheetLayout } from "../../../helpers";
import type { AnimationPlan, SheetTrack, TileAction } from "../../../types";
import { CHROMA_KEY_HEX } from "@/lib/image/constants";
import { unionOf } from "@/lib/edit/raster";
import { sheetToFrames } from "@/lib/image/sheet";
import {
  MIN_MOVING_SHARE,
  UNREACHABLE,
  type Chat,
  type LayerInfo,
} from "../constants";
import { emptyCel, opaqueIn, paint, replaceArea } from "../helpers";
import { framesSheet } from "./pictures";

type Drawn = {
  cels: (Uint8ClampedArray | null)[];
  image: string;
};

class StepError extends Error {}

export async function animate(chat: Chat, action: TileAction) {
  const { canvas } = chat;
  chat.setPending(true);
  const size = canvas.size();
  const layers = canvas.layers();
  const objects = canvas.objects();
  const names = new Map(layers.map((l) => [l.id, l.name]));
  const plan = await planAnimation({
    request: action.request,
    tile: canvas.snapshot(),
    width: size.w,
    height: size.h,
    layers: layers.map(({ name, box }) => ({ name, box })),
    objects: objects.map((o) => o.area),
    objectLayers: objects.map((o) => names.get(o.layerId) ?? ""),
    frames: action.frames ?? 0,
  }).catch(() => UNREACHABLE);
  chat.setPending(false);
  if (!plan.ok) return chat.setError(plan.error);
  const { frameCount, duration } = plan.value;
  const track = plan.value.tracks[0];
  if (!track)
    return chat.say(
      "I couldn’t work out what should move. Try describing the action.",
    );

  track.composition = action.composition;
  track.style = action.style;
  if (track.reuse !== null && !layers[track.reuse]?.editable)
    return chat.say("Unlock the layer before animating it.");
  const moving =
    track.reuse !== null ? movingLayer(chat, layers, track) : undefined;
  const reused =
    moving ?? (track.reuse !== null ? layers[track.reuse] : undefined);
  const pictures = 1;
  chat.append({
    role: "assistant",
    content: [
      plan.value.summary,
      `${frameCount} frames × ${duration} ms, ` +
        (reused
          ? `animates the layer "${reused.name}".`
          : `on a new layer "${track.name}".`),
    ]
      .filter(Boolean)
      .join("\n"),
    button: {
      label: `Generate animation · ${pictures} picture${pictures > 1 ? "s" : ""}`,
      run: () => draw(chat, plan.value, track, layers, moving),
    },
  });
}

async function draw(
  chat: Chat,
  plan: AnimationPlan,
  track: SheetTrack,
  layers: LayerInfo[],
  moving: LayerInfo | undefined,
) {
  const { canvas } = chat;
  chat.setPending(true);
  chat.setError(null);
  try {
    const drawn = moving
      ? await drawInPlace(chat, track, moving)
      : await drawSheet(chat, track, layers);
    const size = canvas.size();
    const area = moving
      ? unionOf([moving.box ?? undefined, track.box])!
      : track.box;
    const frames = drawn.cels.filter((cel): cel is Uint8ClampedArray => !!cel);
    if (frames.length !== plan.frameCount)
      throw new StepError(
        "The animation has missing frames. The original drawing was kept.",
      );
    const baseline = moving
      ? canvas.readCel(moving.id, canvas.frameId())
      : frames[0]!;
    const layout = sheetLayout(plan.frameCount, area.w, area.h);
    const checked = await reviewEdit({
      request: `Check this animation of ${track.subject}. Both pictures are ${layout.cols} columns by ${layout.rows} rows in reading order. The first is a repeated design reference, the second is the final animation. Expected consecutive poses: ${track.poses.map((p, i) => `${i + 1}: ${p}`).join("; ")}.`,
      instruction:
        "Accept intentional pose changes matching the sequence. Reject unrelated or out-of-order poses, missing frames, character redesign, lost details, unrequested whole-body drift or scale changes. Ignore unused cells at the end.",
      before: framesSheet(
        frames.map(() => baseline),
        size,
        area,
        layout,
      ),
      after: framesSheet(frames, size, area, layout),
    }).catch(() => UNREACHABLE);
    if (!checked.ok) throw new StepError(checked.error);
    if (!checked.value.ok)
      throw new StepError(
        `${checked.value.problem || "The animation did not pass the consistency check."} The original drawing was kept. Try generating again.`,
      );
    const spec: AnimationSpec = {
      name: plan.name,
      frameCount: plan.frameCount,
      duration: plan.duration,
      layers: [
        {
          name: track.name,
          cels: drawn.cels,
          replaces:
            moving?.id ??
            (track.reuse !== null ? layers[track.reuse]?.id : undefined),
        },
      ],
    };
    canvas.addAnimation(spec);
    canvas.play();
    chat.append({
      role: "assistant",
      content: `${track.name}:`,
      image: drawn.image,
    });
    chat.say(
      `Done: "${plan.name}", ${plan.frameCount} frames. It is playing now.`,
    );
    return true;
  } catch (e) {
    chat.setError(
      e instanceof StepError ? e.message : "Couldn’t make the animation.",
    );
    return false;
  } finally {
    chat.setPending(false);
  }
}

function movingLayer(
  chat: Chat,
  layers: LayerInfo[],
  track: SheetTrack,
): LayerInfo | undefined {
  const { canvas } = chat;
  const size = canvas.size();
  const frame = canvas.frameId();
  const least = Math.max(1, track.box.w * track.box.h * MIN_MOVING_SHARE);
  const selected = track.reuse !== null ? layers[track.reuse] : undefined;
  if (selected?.editable && selected.box) return selected;
  return layers.find(
    (layer) =>
      layer.editable &&
      !!layer.box &&
      opaqueIn(canvas.readCel(layer.id, frame), size, track.box) >= least,
  );
}

async function drawInPlace(
  chat: Chat,
  track: SheetTrack,
  layer: LayerInfo,
): Promise<Drawn> {
  const { canvas } = chat;
  const size = canvas.size();
  const area = unionOf([layer.box ?? undefined, track.box])!;
  const cel = canvas.readCel(layer.id, canvas.frameId());
  // One reference sheet keeps the complete action and frame order in context.
  const groups = [track.poses];
  const sheets = await Promise.all(
    groups.map(async (poses) => {
      const result = await animateSheet({
        style: track.style,
        subject: track.subject,
        poses,
        sheet: framesSheet(
          poses.map(() => cel),
          size,
          area,
          sheetLayout(poses.length, area.w, area.h),
        ),
        cellW: area.w,
        cellH: area.h,
      }).catch(() => UNREACHABLE);
      if (!result.ok) throw new StepError(result.error);
      const { image, layout } = result.value;
      const frames = await sheetToFrames(
        await (await fetch(image)).blob(),
        layout,
        poses.length,
        area,
        "cells",
        track.composition === "scene",
      );
      return { image, frames };
    }),
  );
  const frames = sheets.flatMap((s) => s.frames);
  if (frames.length !== track.poses.length || !frames.every(Boolean))
    throw new StepError(`Couldn’t cut "${track.name}" into frames. Try again.`);
  let next = 0;
  const cels = track.poses.map((pose) => {
    const frame = pose ? frames[next++] : null;
    return frame ? replaceArea(cel, size, frame, area) : cel;
  });
  return { cels, image: sheets[0]!.image };
}

async function drawSheet(
  chat: Chat,
  track: SheetTrack,
  layers: LayerInfo[],
): Promise<Drawn> {
  const { canvas } = chat;
  const size = canvas.size();
  const reused = track.reuse !== null ? layers[track.reuse] : undefined;
  const reference = reused?.box
    ? canvas.snapshotCel(
        reused.id,
        canvas.frameId(),
        reused.box,
        CHROMA_KEY_HEX,
      )
    : null;
  const visible = track.poses.filter(Boolean);
  const result = await generateSheet({
    subject: track.subject,
    poses: visible,
    cellW: track.box.w,
    cellH: track.box.h,
    reference,
    style: track.style,
    composition: track.composition,
  }).catch(() => UNREACHABLE);
  if (!result.ok) throw new StepError(result.error);
  const { image, layout } = result.value;
  const frames = await sheetToFrames(
    await (await fetch(image)).blob(),
    layout,
    visible.length,
    track.box,
    "cells",
    track.composition === "scene",
  );
  if (frames.length !== track.poses.length || !frames.every(Boolean))
    throw new StepError(`Couldn’t cut "${track.name}" into frames. Try again.`);
  let next = 0;
  const cels = track.poses.map((pose) => {
    if (!pose) return null;
    const frame = frames[next++];
    return frame ? paint(emptyCel(size), size, frame.rgba, track.box) : null;
  });
  return { cels, image };
}
