import type { Area } from "@/components/pixel-canvas/constants";
import type { AnimationSpec } from "@/components/pixel-canvas/use-sprite";
import { generateImage, generateSheet, planAnimation } from "@/lib/ai/actions";
import type {
  AnimationPlan,
  PropTrack,
  SheetTrack,
  TileAction,
} from "@/lib/ai/types";
import { liftObjectsInside } from "@/lib/edit/objects";
import { cropBitmap, resizeNearest, type Bitmap } from "@/lib/image/bitmap";
import { sheetToFrames } from "@/lib/image/sheet";
import {
  UNREACHABLE,
  type Chat,
  type LayerInfo,
  type TileObject,
} from "../constants";
import { emptyCel, paint } from "../helpers";
import { referenceBackground, toArt } from "./pictures";

/** A track drawn into its cels, one per frame (null where it is not seen). */
type Drawn = { cels: (Uint8ClampedArray | null)[]; image: string };

/** What a failed step says; the flow stops there and changes nothing. */
class StepError extends Error {}

/**
 * Plans an animation (free) and shows the plan with a button: drawing it
 * takes one paid picture per track, so nothing is drawn before the click.
 */
export async function animate(chat: Chat, action: TileAction) {
  const { canvas } = chat;
  chat.setPending(true);
  const size = canvas.size();
  // The planner refers to layers and objects by their place in these lists.
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
  const { tracks, frameCount, duration } = plan.value;
  const held = heldThings(chat, tracks, layers, objects);
  if (!tracks.length)
    return chat.say(
      "I couldn’t work out what should move. Try describing the action.",
    );

  const paid = tracks.filter(
    (t) => !(t.kind === "prop" && (t.copy !== null || held.has(t))),
  ).length;
  const pictures = paid === 1 ? "1 picture" : `${paid} pictures`;
  chat.append({
    role: "assistant",
    content: [
      plan.value.summary,
      `${frameCount} frames × ${duration} ms, layers:`,
      ...tracks.map((t) => `• ${t.name} — ${describe(t, layers, held, names)}`),
    ]
      .filter(Boolean)
      .join("\n"),
    button: {
      label: paid ? `Generate animation · ${pictures}` : "Make the animation",
      run: () => draw(chat, plan.value, layers, objects, held),
    },
  });
}

/** A thing cut out of the layer it is drawn on into a layer of its own. */
type Held = { holderId: string; area: Area };

/**
 * The props that fly a thing drawn as part of another layer (a skull held in
 * the necromancer's hand), with that layer and the box around the thing:
 * each is cut out into a layer of its own before it moves. That covers the
 * props the planner says to grab (when it doesn't name the layer, the one
 * with the most drawn there), and those copying an object of a layer a sheet
 * redraws: that object is the whole character, so the thing is taken from
 * where its path starts instead of flying the character twice.
 */
function heldThings(
  chat: Chat,
  tracks: AnimationPlan["tracks"],
  layers: LayerInfo[],
  objects: TileObject[],
) {
  const redrawn = new Set(
    tracks.flatMap((t) =>
      t.kind === "sheet" && t.reuse !== null ? [layers[t.reuse]?.id] : [],
    ),
  );
  const held = new Map<PropTrack, Held>();
  for (const t of tracks) {
    if (t.kind !== "prop") continue;
    const copied = t.copy !== null ? objects[t.copy] : undefined;
    if (t.grab) {
      const holderId =
        (t.grab.layer !== null ? layers[t.grab.layer]?.id : undefined) ??
        mostDrawnIn(chat, layers, t.grab.area);
      if (holderId) held.set(t, { holderId, area: t.grab.area });
    } else if (copied && redrawn.has(copied.layerId)) {
      const start = t.path.find((r) => r !== null);
      if (start) held.set(t, { holderId: copied.layerId, area: start });
    }
  }
  return held;
}

/** The layer with the most drawn in `area` of the current frame. */
function mostDrawnIn(chat: Chat, layers: LayerInfo[], area: Area) {
  const { canvas } = chat;
  const size = canvas.size();
  let best: { id: string; count: number } | null = null;
  for (const layer of layers) {
    const cel = canvas.readCel(layer.id, canvas.frameId());
    let count = 0;
    for (let y = area.y; y < area.y + area.h; y++)
      for (let x = area.x; x < area.x + area.w; x++)
        if (cel[(y * size.w + x) * 4 + 3]) count++;
    if (count && (!best || count > best.count)) best = { id: layer.id, count };
  }
  return best?.id;
}

/** How a track moves, for the plan shown to the user. */
function describe(
  track: SheetTrack | PropTrack,
  layers: LayerInfo[],
  held: Map<PropTrack, Held>,
  names: Map<string, string>,
) {
  const seen = (track.kind === "sheet" ? track.poses : track.path).filter(
    Boolean,
  ).length;
  const grabbed = track.kind === "prop" ? held.get(track) : undefined;
  if (grabbed)
    return `cut out of "${names.get(grabbed.holderId)}" into its own layer, moves in ${seen} frames`;
  if (track.kind === "prop")
    return track.copy !== null
      ? `the one already drawn flies, in ${seen} frames`
      : `new, moves in ${seen} frames`;
  const reused = track.reuse !== null ? layers[track.reuse] : undefined;
  return reused
    ? `animates the existing layer "${reused.name}", ${seen} poses`
    : `new, ${seen} poses`;
}

/**
 * Draws every track (the paid pictures, all at once), then adds the frames
 * and layers in one undo step and plays the animation. Nothing changes when
 * a picture fails, and the button stays for another try.
 */
async function draw(
  chat: Chat,
  plan: AnimationPlan,
  layers: LayerInfo[],
  objects: TileObject[],
  held: Map<PropTrack, Held>,
) {
  const { canvas } = chat;
  // Things drawn as part of a layer go to layers of their own first; the
  // user checks each box, as the planner's is only a guess.
  const cut = new Map<PropTrack, { layerId: string; area: Area }>();
  for (const [track, { holderId, area: guess }] of held) {
    chat.say(
      `Move or resize the frame so it covers just the ${track.name}: it goes to a layer of its own. Then press "Generate here".`,
    );
    const area = await canvas.adjustArea(guess);
    if (!area) {
      chat.say("Cancelled, nothing changed.");
      return false;
    }
    cut.set(track, {
      layerId: canvas.cutToLayer(holderId, area, track.name),
      area,
    });
  }
  chat.setPending(true);
  chat.setError(null);
  try {
    const drawn = await Promise.all(
      plan.tracks.map((track) =>
        track.kind === "sheet"
          ? drawSheet(chat, track, layers)
          : drawProp(chat, track, objects, cut.get(track)),
      ),
    );
    const replaced = new Set(
      plan.tracks.flatMap((t) =>
        t.kind === "sheet" && t.reuse !== null ? [layers[t.reuse]?.id] : [],
      ),
    );
    const spec: AnimationSpec = {
      name: plan.name,
      frameCount: plan.frameCount,
      duration: plan.duration,
      layers: [
        ...plan.tracks.map((track, i) => ({
          name: track.name,
          cels: drawn[i]!.cels,
          replaces:
            track.kind === "sheet" && track.reuse !== null
              ? layers[track.reuse]?.id
              : track.kind === "prop"
                ? cut.get(track)?.layerId
                : undefined,
        })),
        // A copied thing leaves its layer once it flies, unless that layer
        // is redrawn by a sheet anyway.
        ...plan.tracks.flatMap((track) =>
          track.kind === "prop" && track.copy !== null && !cut.has(track)
            ? leaving(chat, track, objects[track.copy], replaced)
            : [],
        ),
      ],
    };
    canvas.addAnimation(spec);
    canvas.play();
    for (const [i, track] of plan.tracks.entries())
      chat.append({
        role: "assistant",
        content: `${track.name}:`,
        image: drawn[i]!.image,
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

/**
 * A sheet track: its visible poses drawn as one sprite sheet (from the
 * existing layer's look when it reuses one), cut into frames and placed in
 * its box.
 */
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
        await referenceBackground(),
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

/**
 * The layer a copied thing flies from, without the thing from the frame it
 * is first seen flying; none when the layer is redrawn anyway.
 */
function leaving(
  chat: Chat,
  track: PropTrack,
  object: TileObject | undefined,
  replaced: Set<string | undefined>,
): AnimationSpec["layers"] {
  if (!object || replaced.has(object.layerId)) return [];
  const { canvas } = chat;
  const size = canvas.size();
  const cel = canvas.readCel(object.layerId, canvas.frameId());
  const { rest } = liftObjectsInside(cel, size.w, size.h, object.area);
  const start = track.path.findIndex(Boolean);
  return [
    {
      name: "",
      cels: track.path.map((_, i) => (i >= start ? rest : cel)),
      replaces: object.layerId,
    },
  ];
}

/**
 * A prop track: the pixels of the object it copies, or a picture drawn once
 * at its largest size; then placed in each frame.
 */
async function drawProp(
  chat: Chat,
  track: PropTrack,
  objects: TileObject[],
  /** The layer the thing was cut out to, and where it was. */
  cut?: { layerId: string; area: Area },
): Promise<Drawn> {
  const { canvas } = chat;
  const size = canvas.size();
  const place = (art: Bitmap) =>
    track.path.map((box) =>
      box
        ? paint(
            emptyCel(size),
            size,
            resizeNearest(art, box.w, box.h).rgba,
            box,
          )
        : null,
    );
  if (cut)
    return {
      cels: place(areaPixels(chat, cut.layerId, cut.area)),
      image: canvas.snapshot(cut.area),
    };
  const object = track.copy !== null ? objects[track.copy] : undefined;
  if (object)
    return {
      cels: place(objectPixels(chat, object)),
      image: canvas.snapshot(object.area),
    };
  const boxes = track.path.filter((r) => r !== null);
  const largest = boxes.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
  const result = await generateImage(track.subject, largest.w, largest.h).catch(
    () => UNREACHABLE,
  );
  if (!result.ok) throw new StepError(result.error);
  return {
    cels: place(await toArt(result.value, largest)),
    image: result.value,
  };
}

/** What a layer shows in `area` of the current frame, as a picture. */
function areaPixels(chat: Chat, layerId: string, area: Area): Bitmap {
  const { canvas } = chat;
  const cel = canvas.readCel(layerId, canvas.frameId());
  return cropBitmap({ rgba: cel, ...canvas.size() }, area);
}

/** Just the pixels of a drawn object (not its neighbours), as a picture of its box. */
function objectPixels(chat: Chat, object: TileObject): Bitmap {
  const { canvas } = chat;
  const size = canvas.size();
  const cel = canvas.readCel(object.layerId, canvas.frameId());
  const { lifted } = liftObjectsInside(cel, size.w, size.h, object.area);
  return { rgba: lifted, w: object.area.w, h: object.area.h };
}
