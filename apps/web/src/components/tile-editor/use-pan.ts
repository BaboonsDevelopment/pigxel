"use client";

import { useEffect, useRef, useState } from "react";
import { isTyping } from "./helpers";

/**
 * Holding Space and dragging scrolls the workspace, as in every drawing app.
 * While Space is held, clicks go to panning instead of the tools.
 */
export function usePan() {
  const [held, setHeld] = useState(false);
  const from = useRef<{ x: number; y: number; left: number; top: number }>(
    null,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTyping(e.target)) return;
      e.preventDefault();
      setHeld(e.type === "keydown");
    };
    const release = () => setHeld(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", release);
    };
  }, []);

  return {
    panning: held,
    /** Handlers for the scrolling workspace element. */
    handlers: {
      onPointerDownCapture: (e: React.PointerEvent<HTMLElement>) => {
        if (!held) return;
        const area = e.currentTarget;
        // Keep the tools from drawing under the pan.
        e.stopPropagation();
        e.preventDefault();
        area.setPointerCapture(e.pointerId);
        from.current = {
          x: e.clientX,
          y: e.clientY,
          left: area.scrollLeft,
          top: area.scrollTop,
        };
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        if (!from.current) return;
        e.currentTarget.scrollTo(
          from.current.left - (e.clientX - from.current.x),
          from.current.top - (e.clientY - from.current.y),
        );
      },
      onPointerUp: () => {
        from.current = null;
      },
    },
  };
}
