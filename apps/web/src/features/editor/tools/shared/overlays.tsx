import type { ReactNode } from "react";
import type { Area, Size } from "../../pixel-canvas/constants";
import type { Point } from "../../pixel-canvas/pen";

export const GUIDE = {
  fill: "rgb(59 130 246 / 0.12)",
  stroke: "rgb(59 130 246)",
  strokeDasharray: "4 3",
  vectorEffect: "non-scaling-stroke",
} as const;

export function ToolSvg({
  size,
  children,
}: {
  size: Size;
  children: ReactNode;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
    >
      {children}
    </svg>
  );
}

export function PathGuide({ points }: { points: Point[] }) {
  return (
    <polyline
      points={points.map((p) => `${p.x + 0.5},${p.y + 0.5}`).join(" ")}
      {...GUIDE}
    />
  );
}

export function Corners({
  points,
  pointer,
}: {
  points: Point[];
  pointer: Point;
}) {
  return points.map((p, i) => {
    const closes =
      i === 0 && points.length >= 3 && p.x === pointer.x && p.y === pointer.y;
    return (
      <rect
        key={i}
        x={p.x}
        y={p.y}
        width={1}
        height={1}
        fill={closes ? "rgb(59 130 246)" : "white"}
        stroke="rgb(59 130 246)"
        vectorEffect="non-scaling-stroke"
      />
    );
  });
}

export function SizeLabel({ box, scale }: { box: Area; scale: number }) {
  return (
    <span
      className="pointer-events-none absolute rounded bg-blue-500 px-2 py-0.5 text-xs whitespace-nowrap text-white tabular-nums"
      style={{
        left: (box.x + box.w) * scale,
        top: (box.y + box.h) * scale + 4,
      }}
    >
      {box.w} × {box.h}
    </span>
  );
}
