import type { AnimationSpec } from "@/components/pixel-canvas/use-sprite";
import { generateImage, generateSheet, planAnimation } from "@/lib/ai/actions";
import type {
  AnimationPlan,
  PropTrack,
  SheetTrack,
  TileAction,
} from "@/lib/ai/types";
import { resizeNearest } from "@/lib/image/bitmap";
import { CHROMA_KEY_HEX } from "@/lib/image/constants";
import { sheetToFrames } from "@/lib/image/sheet";
import { UNREACHABLE, type Chat, type LayerInfo } from "../constants";
import { emptyCel, paint, toArt } from "../helpers";

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
  // The planner refers to layers by their place in this list.
  const layers = canvas.layers();
  const plan = await planAnimation({
    request: action.request,
    tile: canvas.snapshot(),
    width: size.w,
    height: size.h,
    layers: layers.map(({ name, box }) => ({ name, box })),
    frames: action.frames ?? 0,
  }).catch(() => UNREACHABLE);
  chat.setPending(false);
  if (!plan.ok) return chat.setError(plan.error);
  const { tracks, frameCount, duration } = plan.value;
  if (!tracks.length)
    return chat.say(
      "I couldn’t work out what should move. Try describing the action.",
    );

  const pictures =
    tracks.length === 1 ? "1 picture" : `${tracks.length} pictures`;
  chat.append({
    role: "assistant",
    content: [
      plan.value.summary,
      `${frameCount} frames × ${duration} ms, layers:`,
      ...tracks.map((t) => `• ${t.name} — ${describe(t, layers)}`),
    ]
      .filter(Boolean)
      .join("\n"),
    button: {
      label: `Generate animation · ${pictures}`,
      run: () => draw(chat, plan.value, layers),
    },
  });
}

/** How a track moves, for the plan shown to the user. */
function describe(track: SheetTrack | PropTrack, layers: LayerInfo[]) {
  const seen = (track.kind === "sheet" ? track.poses : track.path).filter(
    Boolean,
  ).length;
  if (track.kind === "prop") return `moves, in ${seen} frames`;
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
async function draw(chat: Chat, plan: AnimationPlan, layers: LayerInfo[]) {
  const { canvas } = chat;
  chat.setPending(true);
  chat.setError(null);
  try {
    const drawn = await Promise.all(
      plan.tracks.map((track) =>
        track.kind === "sheet"
          ? drawSheet(chat, track, layers)
          : drawProp(chat, track),
      ),
    );
    const spec: AnimationSpec = {
      name: plan.name,
      frameCount: plan.frameCount,
      duration: plan.duration,
      layers: plan.tracks.map((track, i) => ({
        name: track.name,
        cels: drawn[i]!.cels,
        replaces:
          track.kind === "sheet" && track.reuse !== null
            ? layers[track.reuse]?.id
            : undefined,
      })),
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

/** A prop track: drawn once at its largest size, then placed in each frame. */
async function drawProp(chat: Chat, track: PropTrack): Promise<Drawn> {
  const size = chat.canvas.size();
  const boxes = track.path.filter((r) => r !== null);
  const largest = boxes.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
  const result = await generateImage(track.subject, largest.w, largest.h).catch(
    () => UNREACHABLE,
  );
  if (!result.ok) throw new StepError(result.error);
  const art = await toArt(result.value, largest);
  const cels = track.path.map((box) =>
    box
      ? paint(emptyCel(size), size, resizeNearest(art, box.w, box.h).rgba, box)
      : null,
  );
  return { cels, image: result.value };
}
