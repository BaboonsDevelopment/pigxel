import {
  DEFAULT_FRAME_DURATION,
  MAX_FRAME_DURATION,
  MIN_FRAME_DURATION,
} from "./constants";
import type { Cels, Frame } from "./types";

export function createFrame(duration = DEFAULT_FRAME_DURATION): Frame {
  return { id: crypto.randomUUID(), duration };
}

/** A frame duration in whole milliseconds, within the allowed range. */
export function clampDuration(ms: number) {
  if (!Number.isFinite(ms)) return DEFAULT_FRAME_DURATION;
  return Math.max(
    MIN_FRAME_DURATION,
    Math.min(MAX_FRAME_DURATION, Math.round(ms)),
  );
}

export function frameIndex(frames: Frame[], id: string) {
  return frames.findIndex((frame) => frame.id === id);
}

/** The frame `step` places from `id`, wrapping around at the ends. */
export function stepFrame(frames: Frame[], id: string, step: number): Frame {
  const at = Math.max(0, frameIndex(frames, id));
  const n = frames.length;
  return frames[(((at + step) % n) + n) % n]!;
}

export function insertFrame(frames: Frame[], frame: Frame, index: number) {
  return [...frames.slice(0, index), frame, ...frames.slice(index)];
}

export function removeFrame(frames: Frame[], id: string) {
  return frames.filter((frame) => frame.id !== id);
}

/** Moves a frame so that it ends up at `index` of the new list. */
export function moveFrame(frames: Frame[], id: string, index: number) {
  const frame = frames.find((f) => f.id === id);
  if (!frame) return frames;
  const rest = removeFrame(frames, id);
  const to = Math.max(0, Math.min(rest.length, index));
  return insertFrame(rest, frame, to);
}

export function updateFrame(
  frames: Frame[],
  id: string,
  patch: Partial<Omit<Frame, "id">>,
) {
  return frames.map((frame) =>
    frame.id === id ? { ...frame, ...patch } : frame,
  );
}

/** The pixels of a layer in a frame, if that cel isn't empty. */
export function celOf(cels: Cels, frameId: string, layerId: string) {
  return cels.get(frameId)?.get(layerId);
}
