import { MAX_SCALE, MIN_SCALE, ZOOM_FACTOR } from "./constants";

type WheelLike = Pick<WheelEvent, "deltaY" | "deltaMode"> & {
  wheelDeltaY?: number;
};

export function fromTouchpad(e: WheelLike): boolean {
  if (e.deltaMode !== 0) return false;
  if (!Number.isInteger(e.deltaY)) return true;
  if (e.wheelDeltaY) return e.wheelDeltaY === -3 * e.deltaY;
  return true;
}

const GESTURE_GAP_MS = 250;

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

export function pinchZoom(scale: number, deltaY: number) {
  return clampScale(scale * Math.exp(-deltaY / 100));
}

export function stepZoom(scale: number, deltaY: number) {
  return clampScale(deltaY < 0 ? scale * ZOOM_FACTOR : scale / ZOOM_FACTOR);
}

export type ZoomAnchor = { x: number; y: number; fx: number; fy: number };

export function zoomAnchor(tile: DOMRect, x: number, y: number): ZoomAnchor {
  return {
    x,
    y,
    fx: (x - tile.left) / tile.width,
    fy: (y - tile.top) / tile.height,
  };
}

export function scrollToAnchor(tile: DOMRect, anchor: ZoomAnchor) {
  return {
    x: tile.left + anchor.fx * tile.width - anchor.x,
    y: tile.top + anchor.fy * tile.height - anchor.y,
  };
}
