"use client";

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { DEFAULT_SCALE } from "@/components/pixel-canvas/constants";
import {
  clampScale,
  pinchZoom,
  scrollToAnchor,
  stepZoom,
  wheelSource,
  zoomAnchor,
  type ZoomAnchor,
} from "@/components/pixel-canvas/wheel";

/** Safari's pinch, which it reports as gesture events of its own. */
type GestureEvent = UIEvent & {
  scale: number;
  clientX: number;
  clientY: number;
};

/**
 * The tile's zoom in the scrolling workspace, always around a point that
 * stays put: the cursor for the wheel and pinches, the middle of the view
 * for keys.
 *
 * A mouse wheel zooms a step per notch, and with Shift scrolls sideways. On
 * a touchpad, two fingers scroll the workspace and a pinch zooms smoothly;
 * Ctrl or ⌘ with the wheel zooms too.
 */
export function useZoom({
  workspace,
  tileRect,
}: {
  workspace: RefObject<HTMLElement | null>;
  tileRect: () => DOMRect | null;
}) {
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const anchor = useRef<ZoomAnchor>(null);
  const [isTouchpad] = useState(wheelSource);
  // The zoom when a Safari pinch began; its scale is relative to that.
  const pinchFrom = useRef<number>(null);

  /** Zooms to `next(scale)`, keeping the spot of the tile under (x, y) there. */
  const zoomTo = (next: (scale: number) => number, x?: number, y?: number) => {
    const tile = tileRect();
    const view = workspace.current?.getBoundingClientRect();
    if (tile && view)
      anchor.current = zoomAnchor(
        tile,
        x ?? view.left + view.width / 2,
        y ?? view.top + view.height / 2,
      );
    setScale((s) => clampScale(next(s)));
  };

  // Once the tile has its new size, scroll the anchored spot back under the point.
  const settle = useEffectEvent(() => {
    const at = anchor.current;
    anchor.current = null;
    const area = workspace.current;
    const tile = tileRect();
    if (!at || !area || !tile) return;
    const by = scrollToAnchor(tile, at);
    area.scrollBy({ left: by.x, top: by.y, behavior: "instant" });
  });
  useLayoutEffect(() => settle(), [scale]);

  const onWheel = useEffectEvent((e: WheelEvent) => {
    const touchpad = isTouchpad(e);
    if (e.ctrlKey || e.metaKey) {
      // A pinch, or Ctrl+wheel: zoom the tile, never the page.
      e.preventDefault();
      if (pinchFrom.current !== null) return;
      zoomTo(
        (s) => (touchpad ? pinchZoom(s, e.deltaY) : stepZoom(s, e.deltaY)),
        e.clientX,
        e.clientY,
      );
      return;
    }
    // Two fingers and Shift+wheel scroll the workspace, as the browser does.
    if (touchpad || e.shiftKey) return;
    e.preventDefault();
    zoomTo((s) => stepZoom(s, e.deltaY), e.clientX, e.clientY);
  });

  const onGesture = useEffectEvent((e: Event) => {
    const pinch = e as GestureEvent;
    e.preventDefault();
    if (e.type === "gesturestart") pinchFrom.current = scale;
    else if (e.type === "gestureend") pinchFrom.current = null;
    else if (pinchFrom.current !== null) {
      const from = pinchFrom.current;
      zoomTo(() => from * pinch.scale, pinch.clientX, pinch.clientY);
    }
  });

  useEffect(() => {
    const area = workspace.current;
    if (!area) return;
    const gestures = ["gesturestart", "gesturechange", "gestureend"];
    area.addEventListener("wheel", onWheel, { passive: false });
    for (const type of gestures) area.addEventListener(type, onGesture);
    return () => {
      area.removeEventListener("wheel", onWheel);
      for (const type of gestures) area.removeEventListener(type, onGesture);
    };
  }, [workspace]);

  return {
    scale,
    zoomIn: () => zoomTo((s) => stepZoom(s, -1)),
    zoomOut: () => zoomTo((s) => stepZoom(s, 1)),
    zoomReset: () => zoomTo(() => DEFAULT_SCALE),
  };
}
