import type { AnimationSpec } from "@/features/editor/pixel-canvas/use-sprite";
import { generateSheet, planAnimation } from "../../../actions";
import type { AnimationPlan, SheetTrack, TileAction } from "../../../types";
import { CHROMA_KEY_HEX } from "@/lib/image/constants";
import { sheetToFrames } from "@/lib/image/sheet";
import { UNREACHABLE, type Chat, type LayerInfo } from "../constants";
import { emptyCel, paint } from "../helpers";

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

  const reused = track.reuse !== null ? layers[track.reuse] : undefined;
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
      label: "Generate animation · 1 picture",
      run: () => draw(chat, plan.value, track, layers),
    },
  });
}

async function draw(
  chat: Chat,
  plan: AnimationPlan,
  track: SheetTrack,
  layers: LayerInfo[],
) {
  const { canvas } = chat;
  chat.setPending(true);
  chat.setError(null);
  try {
    const drawn = await drawSheet(chat, track, layers);
    const spec: AnimationSpec = {
      name: plan.name,
      frameCount: plan.frameCount,
      duration: plan.duration,
      layers: [
        {
          name: track.name,
          cels: drawn.cels,
          replaces: track.reuse !== null ? layers[track.reuse]?.id : undefined,
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
  }).catch(() => UNREACHABLE);
  if (!result.ok) throw new StepError(result.error);
  const { image, layout } = result.value;
  const frames = await sheetToFrames(
    await (await fetch(image)).blob(),
    layout,
    visible.length,
    track.box,
    "cells",
  );
  if (!frames.some(Boolean))
    throw new StepError(`Couldn’t cut "${track.name}" into frames. Try again.`);
  let next = 0;
  const cels = track.poses.map((pose) => {
    if (!pose) return null;
    const frame = frames[next++];
    return frame ? paint(emptyCel(size), size, frame.rgba, track.box) : null;
  });
  return { cels, image };
}
