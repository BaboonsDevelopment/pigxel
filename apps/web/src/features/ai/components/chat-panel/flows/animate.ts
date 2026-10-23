import type { AnimationSpec } from "@/features/editor/pixel-canvas/use-sprite";
import { generateAnimation, planAnimation } from "../../../actions";
import { sheetLayout } from "../../../helpers";
import type { AnimationPlan, SheetTrack, TileAction } from "../../../types";
import { CHROMA_KEY_HEX } from "@/lib/image/constants";
import { unionOf } from "@/lib/edit/raster";
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
    const frames = drawn.cels.filter((cel): cel is Uint8ClampedArray => !!cel);
    if (frames.length !== plan.frameCount)
      throw new StepError(
        "The animation has missing frames. The original drawing was kept.",
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
  const drawn = await requestFrames(
    track,
    area,
    framesSheet(
      track.poses.map(() => cel),
      size,
      area,
      sheetLayout(track.poses.length, area.w, area.h),
    ),
    null,
  );
  const frames = drawn.frames;
  let next = 0;
  const cels = track.poses.map((pose) => {
    const frame = pose ? frames[next++] : null;
    return frame ? replaceArea(cel, size, frame, area) : cel;
  });
  return { cels, image: drawn.image };
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
  const { image, frames } = await requestFrames(
    track,
    track.box,
    null,
    reference,
  );
  let next = 0;
  const cels = track.poses.map((pose) => {
    if (!pose) return null;
    const frame = frames[next++];
    return frame ? paint(emptyCel(size), size, frame.rgba, track.box) : null;
  });
  return { cels, image };
}

async function requestFrames(
  track: SheetTrack,
  area: { w: number; h: number },
  sheet: string | null,
  reference: string | null,
) {
  const result = await generateAnimation({
    subject: track.subject,
    poses: track.poses,
    cellW: area.w,
    cellH: area.h,
    sheet,
    reference,
    style: track.style,
    composition: track.composition,
    anchor: track.anchor,
  }).catch(() => UNREACHABLE);
  if (!result.ok) throw new StepError(result.error);
  const frames = result.value.frames.map((bytes) => ({
    w: area.w,
    h: area.h,
    rgba: Uint8ClampedArray.from(atob(bytes), (c) => c.charCodeAt(0)),
  }));
  if (
    frames.length !== track.poses.length ||
    frames.some((f) => f.rgba.length !== area.w * area.h * 4)
  )
    throw new StepError(
      "The animation response was incomplete. The original drawing was kept.",
    );
  return { image: result.value.image, frames };
}
