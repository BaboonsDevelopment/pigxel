"use client";

import { useState, type PointerEvent } from "react";
import type {
  DockSide,
  PanelId,
  PanelTarget,
} from "@/lib/editor-layout/layout";

export type PanelDrag = ReturnType<typeof usePanelDrag>;

/** A drop place with the screen area it would take, to show while dragging. */
type DropPreview = {
  target: PanelTarget;
  area: { left: number; top: number; width: number; height: number };
};

/** How far the pointer moves before a press on a title bar becomes a drag. */
const DRAG_START = 4;
/** The share of a panel's width at each side that drops beside it. */
const SIDE_ZONE = 0.25;
/** How wide the strip is that shows a drop beside a column. */
const BESIDE = 8;
/** The share of the canvas's width at each side that drops a panel beside it. */
const CANVAS_ZONE = 0.2;
/** How wide the lit area is for a drop beside the canvas. */
const CANVAS_PANEL = 240;

/**
 * Where a panel dropped at (x, y) lands, as Visual Studio shows it: on
 * another panel, its outer quarters put it beside (a new stack left or
 * right), its top and bottom halves above or below it; on the canvas's left
 * or right fifth, beside the canvas only; on an empty dock's strip, into
 * that dock.
 */
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
    const half = { width: r.width / 2, height: r.height / 2 };
    // Beside: a new column at the edge of the whole column, so a strip
    // along that edge shows it, not a part of the panel.
    const column = (
      panel.closest("[data-stack]") ?? panel
    ).getBoundingClientRect();
    const area =
      where === "left" || where === "right"
        ? {
            left: (where === "left" ? column.left : column.right) - BESIDE / 2,
            top: column.top,
            width: BESIDE,
            height: column.height,
          }
        : where === "above"
          ? { left: r.left, top: r.top, width: r.width, height: half.height }
          : {
              left: r.left,
              top: r.top + half.height,
              width: r.width,
              height: half.height,
            };
    return { target: { kind: "panel", anchor, where }, area };
  }
  // On the canvas's edge: beside the canvas only, above the bottom dock, so
  // the timeline keeps its width.
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
        // Next to the canvas.
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

/**
 * Dragging panels by their title bar: a card with the panel's name follows
 * the pointer, and the place it would land is lit up until it is dropped.
 */
export function usePanelDrag(
  onDrop: (id: PanelId, target: PanelTarget) => void,
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
      last = previewAt(at.x, at.y, id);
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
