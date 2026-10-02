import { MAX_SCALE, MIN_SCALE, ZOOM_FACTOR } from "./constants";

/** The parts of a wheel event that tell a mouse wheel from a touchpad. */
type WheelLike = Pick<WheelEvent, "deltaY" | "deltaMode"> & {
  /** Chrome, Safari and Edge's older delta: notches of 120 for a mouse wheel. */
  wheelDeltaY?: number;
};

/**
 * Whether a wheel event comes from two fingers on a touchpad rather than the
 * notches of a mouse wheel. A mouse wheel scrolls by lines in Firefox, and
 * elsewhere its older `wheelDeltaY` is a notch of 120 that isn't three
 * times the delta, as it is for a touchpad's pixels.
 */
export function fromTouchpad(e: WheelLike): boolean {
  if (e.deltaMode !== 0) return false;
  if (!Number.isInteger(e.deltaY)) return true;
  if (e.wheelDeltaY) return e.wheelDeltaY === -3 * e.deltaY;
  return true;
}

/** Wheel events closer together than this belong to one gesture. */
const GESTURE_GAP_MS = 250;

/**
 * Tells, event by event, whether wheel events come from a touchpad. Once a
 * gesture looks like a touchpad it stays one, so its gliding tail of round
 * numbers isn't taken for a mouse wheel.
 */
export function wheelSource() {
  let last = -Infinity;
  let touchpad = false;
  return (e: WheelLike & Pick<WheelEvent, "timeStamp">) => {
    const sameGesture = e.timeStamp - last < GESTURE_GAP_MS;
    touchpad = (sameGesture && touchpad) || fromTouchpad(e);
    last = e.timeStamp;
    return touchpad;
  };
}

export function clampScale(scale: number) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
}

/**
 * The zoom after a pinch on a touchpad, which arrives as many small wheel
 * steps: smooth, about 1% per pixel of `deltaY`; pinching out zooms in.
 */
export function pinchZoom(scale: number, deltaY: number) {
  return clampScale(scale * Math.exp(-deltaY / 100));
}

/** The next zoom level for a mouse wheel notch or a key; scrolling up zooms in. */
export function stepZoom(scale: number, deltaY: number) {
  return clampScale(deltaY < 0 ? scale * ZOOM_FACTOR : scale / ZOOM_FACTOR);
}

/** A point on screen and where it falls on the tile, as fractions of its size, to zoom around. */
export type ZoomAnchor = { x: number; y: number; fx: number; fy: number };

export function zoomAnchor(tile: DOMRect, x: number, y: number): ZoomAnchor {
  return {
    x,
    y,
    fx: (x - tile.left) / tile.width,
    fy: (y - tile.top) / tile.height,
  };
}

/** How far to scroll so the anchored spot of the zoomed tile is back under the same point. */
export function scrollToAnchor(tile: DOMRect, anchor: ZoomAnchor) {
  return {
    x: tile.left + anchor.fx * tile.width - anchor.x,
    y: tile.top + anchor.fy * tile.height - anchor.y,
  };
}
