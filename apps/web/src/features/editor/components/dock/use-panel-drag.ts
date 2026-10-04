"use client";

import { useState, type PointerEvent } from "react";
import type { DockSide, PanelId, PanelTarget } from "../../layout";

export type PanelDrag = ReturnType<typeof usePanelDrag>;

type DropPreview = {
  target: PanelTarget;
  area: { left: number; top: number; width: number; height: number };
};

const DRAG_START = 4;
const SIDE_ZONE = 0.25;
const BESIDE = 8;
const GAP_SLOT = 160;
const CANVAS_ZONE = 0.2;
const CANVAS_PANEL = 240;

function previewAt(x: number, y: number, dragged: PanelId): DropPreview | null {
  const under = document.elementFromPoint(x, y);
  const panel = under?.closest<HTMLElement>("[data-panel]");
  if (panel) {
    const anchor = panel.dataset.panel as PanelId;
    if (anchor === dragged) return null;
    const r = panel.getBoundingClientRect();
    const fx = (x - r.left) / r.width;
    const where =
      fx < SIDE_ZONE
        ? "left"
        : fx > 1 - SIDE_ZONE
          ? "right"
          : y < r.top + r.height / 2
            ? "above"
            : "below";
    const stack = panel.closest<HTMLElement>("[data-stack]");
    const column = (stack ?? panel).getBoundingClientRect();
    const area =
      where === "left" || where === "right"
        ? {
            left: (where === "left" ? column.left : column.right) - BESIDE / 2,
            top: column.top,
            width: BESIDE,
            height: column.height,
          }
        : where === "above"
          ? {
              left: r.left,
              top: r.top - BESIDE / 2,
              width: r.width,
              height: BESIDE,
            }
          : below(panel, stack, dragged);
    return { target: { kind: "panel", anchor, where }, area };
  }
  const stack = under?.closest<HTMLElement>("[data-stack]");
  const last = stack && lastPanel(stack, dragged);
  if (stack && last)
    return {
      target: {
        kind: "panel",
        anchor: last.dataset.panel as PanelId,
        where: "below",
      },
      area: below(last, stack, dragged),
    };
  const canvas = under?.closest<HTMLElement>("[data-canvas-drop]");
  if (canvas) {
    const r = canvas.getBoundingClientRect();
    const fx = (x - r.left) / r.width;
    if (fx > CANVAS_ZONE && fx < 1 - CANVAS_ZONE) return null;
    const left = fx <= CANVAS_ZONE;
    const width = Math.min(CANVAS_PANEL, r.width * 0.4);
    return {
      target: {
        kind: "dock",
        dock: left ? "innerLeft" : "innerRight",
        where: left ? "end" : "start",
      },
      area: {
        left: left ? r.left : r.right - width,
        top: r.top,
        width,
        height: r.height,
      },
    };
  }
  const dock = under?.closest<HTMLElement>("[data-dock]");
  if (dock && !dock.querySelector("[data-panel]")) {
    const r = dock.getBoundingClientRect();
    return {
      target: {
        kind: "dock",
        dock: dock.dataset.dock as DockSide,
        where: "end",
      },
      area: { left: r.left, top: r.top, width: r.width, height: r.height },
    };
  }
  return null;
}

function lastPanel(stack: HTMLElement, dragged: PanelId) {
  return [...stack.querySelectorAll<HTMLElement>("[data-panel]")]
    .filter((p) => p.dataset.panel !== dragged)
    .at(-1);
}

function below(
  panel: HTMLElement,
  stack: HTMLElement | null,
  dragged: PanelId,
) {
  const r = panel.getBoundingClientRect();
  const column = stack?.getBoundingClientRect();
  const room = column ? column.bottom - r.bottom : 0;
  if (stack && lastPanel(stack, dragged) === panel && room > BESIDE * 2)
    return {
      left: r.left,
      top: r.bottom,
      width: r.width,
      height: Math.min(room, GAP_SLOT),
    };
  return {
    left: r.left,
    top: r.bottom - BESIDE / 2,
    width: r.width,
    height: BESIDE,
  };
}

export function usePanelDrag(
  onDrop: (id: PanelId, target: PanelTarget) => void,
  changes: (id: PanelId, target: PanelTarget) => boolean,
) {
  const [dragging, setDragging] = useState<PanelId | null>(null);
  const [preview, setPreview] = useState<DropPreview | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  const start = (id: PanelId, e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const handle = e.currentTarget;
    const from = { x: e.clientX, y: e.clientY };
    let started = false;
    let last: DropPreview | null = null;
    handle.setPointerCapture(e.pointerId);
    const move = (event: globalThis.PointerEvent) => {
      const at = { x: event.clientX, y: event.clientY };
      if (!started && Math.hypot(at.x - from.x, at.y - from.y) < DRAG_START)
        return;
      if (!started) {
        started = true;
        setDragging(id);
      }
      setPointer(at);
      const found = previewAt(at.x, at.y, id);
      last = found && changes(id, found.target) ? found : null;
      setPreview(last);
    };
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      if (started && last) onDrop(id, last.target);
      setDragging(null);
      setPreview(null);
      setPointer(null);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  };

  return { dragging, preview, pointer, start };
}
