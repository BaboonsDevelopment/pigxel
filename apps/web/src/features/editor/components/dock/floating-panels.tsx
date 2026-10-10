"use client";

import {
  FLOAT_MIN,
  HOME,
  PANEL_LABELS,
  floatingPanels,
  movePanel,
  setFloatRect,
  setPanelShown,
  type FloatRect,
  type Layout,
  type PanelId,
} from "../../layout";
import type { PanelContent, SetLayout } from "./dock";
import { Panel } from "./panel";
import type { PanelDrag } from "./use-panel-drag";

const inView = (rect: FloatRect): FloatRect => ({
  ...rect,
  x: Math.min(Math.max(0, rect.x), Math.max(0, window.innerWidth - rect.w)),
  y: Math.min(Math.max(0, rect.y), Math.max(0, window.innerHeight - 40)),
});

export function FloatingPanels({
  layout,
  panels,
  drag,
  setLayout,
}: {
  layout: Layout;
  panels: Record<PanelId, PanelContent>;
  drag: PanelDrag;
  setLayout: SetLayout;
}) {
  const shown = floatingPanels(layout);
  if (!shown.length || typeof window === "undefined") return null;

  const resize = (
    event: React.PointerEvent<HTMLElement>,
    id: PanelId,
    rect: FloatRect,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const from = { x: event.clientX, y: event.clientY };
    handle.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) =>
      setLayout((l) =>
        setFloatRect(l, id, {
          ...rect,
          w: Math.max(FLOAT_MIN.w, rect.w + e.clientX - from.x),
          h: Math.max(FLOAT_MIN.h, rect.h + e.clientY - from.y),
        }),
      );
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  };

  return shown.map(([id, saved]) => {
    const rect = inView(saved);
    return (
      <div
        key={id}
        data-floating
        className="fixed z-40 flex rounded-lg shadow-2xl"
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      >
        <Panel
          id={id}
          title={PANEL_LABELS[id]}
          collapsed={false}
          floating
          fill
          actions={panels[id].actions}
          dragging={drag.dragging === id}
          onDragStart={drag.start}
          onCollapse={() => {}}
          onFloat={() =>
            setLayout((l) =>
              movePanel(l, id, { kind: "dock", dock: HOME[id], where: "end" }),
            )
          }
          onClose={() => setLayout((l) => setPanelShown(l, id, false))}
        >
          {panels[id].body}
        </Panel>
        <span
          aria-hidden="true"
          onPointerDown={(e) => resize(e, id, rect)}
          className="absolute right-0 bottom-0 size-3 cursor-nwse-resize touch-none"
        />
      </div>
    );
  });
}
