"use client";

import { useMemo, useRef } from "react";
import { curveTable, type CurvePoint } from "../pixel-canvas/effects";

const GRID = [64, 128, 192];
const VIEW = 264;

export function CurveEditor({
  points,
  onChange,
}: {
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const line = useMemo(() => {
    const table = curveTable(points);
    return Array.from(table, (y, x) => `${x},${255 - y}`).join(" ");
  }, [points]);

  const at = (e: { clientX: number; clientY: number }) => {
    const r = svg.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
    return [
      clamp(((e.clientX - r.left) / r.width) * VIEW - 4),
      clamp(255 - (((e.clientY - r.top) / r.height) * VIEW - 4)),
    ] as CurvePoint;
  };
  const nearest = (p: CurvePoint) => {
    const r = svg.current!.getBoundingClientRect();
    const reach = (8 * VIEW) / r.width;
    let found = -1;
    let best = reach;
    points.forEach(([x, y], i) => {
      const d = Math.hypot(x - p[0], y - p[1]);
      if (d <= best) {
        best = d;
        found = i;
      }
    });
    return found;
  };
  const removable = (i: number) => i > 0 && i < points.length - 1;

  const start = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const p = at(e);
    let list = points;
    let index = nearest(p);
    if (index < 0) {
      if (list.some(([x]) => x === p[0])) return;
      index = list.findIndex(([x]) => x > p[0]);
      list = [...list.slice(0, index), p, ...list.slice(index)];
      onChange(list);
    }
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (event: PointerEvent) => {
      const [x, y] = at(event);
      const min = index === 0 ? 0 : list[index - 1]![0] + 1;
      const max = index === list.length - 1 ? 255 : list[index + 1]![0] - 1;
      list = list.map((q, i) =>
        i === index ? [Math.min(max, Math.max(min, x)), y] : q,
      );
      onChange(list);
    };
    const end = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  };
  const remove = (e: React.MouseEvent) => {
    const i = nearest(at(e));
    if (!removable(i)) return false;
    onChange(points.filter((_, j) => j !== i));
    return true;
  };

  return (
    <svg
      ref={svg}
      viewBox="-4 -4 264 264"
      role="img"
      aria-label="Colour curve: click to add a point, drag to move, double-click or right-click a point to remove it"
      onPointerDown={start}
      onDoubleClick={remove}
      onContextMenu={(e) => {
        e.preventDefault();
        remove(e);
      }}
      className="aspect-square w-full max-w-64 cursor-crosshair touch-none rounded-lg border bg-muted select-none"
    >
      {GRID.map((v) => (
        <g key={v} stroke="currentColor" strokeOpacity={0.12}>
          <line x1={v} y1={0} x2={v} y2={255} />
          <line x1={0} y1={v} x2={255} y2={v} />
        </g>
      ))}
      <line
        x1={0}
        y1={255}
        x2={255}
        y2={0}
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeDasharray="4 4"
      />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
      {points.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={255 - y}
          r={5}
          fill="var(--background)"
          stroke="currentColor"
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}
