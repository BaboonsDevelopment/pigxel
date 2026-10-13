"use client";

import { useEffect, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";

const GRID = 12;
const STEP_MS = 70;

const RING = Array.from({ length: GRID * GRID }, (_, i) => ({
  x: i % GRID,
  y: Math.floor(i / GRID),
}))
  .filter(({ x, y }) => {
    const distance = Math.hypot(x - 5.5, y - 5.5);
    return distance >= 4.3 && distance < 5.5;
  })
  .sort(
    (a, b) =>
      Math.atan2(a.y - 5.5, a.x - 5.5) - Math.atan2(b.y - 5.5, b.x - 5.5),
  );

export function PixelSpinner({ className }: { className?: string }) {
  const [head, setHead] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setHead((step) => (step + 1) % RING.length),
      STEP_MS,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${GRID} ${GRID}`}
      shapeRendering="crispEdges"
      className={cn("size-6 shrink-0", className)}
    >
      {RING.map(({ x, y }, i) => {
        const behind = (head - i + RING.length) % RING.length;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={1}
            height={1}
            fill="currentColor"
            opacity={Math.max(0.25, 1 - behind / (RING.length * 0.6))}
          />
        );
      })}
    </svg>
  );
}
