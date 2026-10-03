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

type GestureEvent = UIEvent & {
  scale: number;
  clientX: number;
  clientY: number;
};

export function useZoom({
  workspace,
  tileRect,
  initial = DEFAULT_SCALE,
}: {
  workspace: RefObject<HTMLElement | null>;
  tileRect: () => DOMRect | null;
  initial?: number;
}) {
  const [scale, setScale] = useState(() => clampScale(initial));
  const anchor = useRef<ZoomAnchor>(null);
  const [isTouchpad] = useState(wheelSource);
  const pinchFrom = useRef<number>(null);

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
      e.preventDefault();
      if (pinchFrom.current !== null) return;
      zoomTo(
        (s) => (touchpad ? pinchZoom(s, e.deltaY) : stepZoom(s, e.deltaY)),
        e.clientX,
        e.clientY,
      );
      return;
    }
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
