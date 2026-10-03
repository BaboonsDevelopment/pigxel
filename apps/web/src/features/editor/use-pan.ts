"use client";

import { useEffect, useRef, useState } from "react";
import { isTyping } from "./helpers";

export function usePan() {
  const [held, setHeld] = useState(false);
  const [dragging, setDragging] = useState(false);
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

  const stop = () => {
    from.current = null;
    setDragging(false);
  };

  return {
    panning: held || dragging,
    handlers: {
      onPointerDownCapture: (e: React.PointerEvent<HTMLElement>) => {
        if (!held && e.button !== 1) return;
        const area = e.currentTarget;
        e.stopPropagation();
        e.preventDefault();
        area.setPointerCapture(e.pointerId);
        from.current = {
          x: e.clientX,
          y: e.clientY,
          left: area.scrollLeft,
          top: area.scrollTop,
        };
        setDragging(true);
      },
      onMouseDown: (e: React.MouseEvent<HTMLElement>) => {
        if (e.button === 1) e.preventDefault();
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        if (!from.current) return;
        e.currentTarget.scrollTo(
          from.current.left - (e.clientX - from.current.x),
          from.current.top - (e.clientY - from.current.y),
        );
      },
      onPointerUp: stop,
      onPointerCancel: stop,
    },
  };
}
