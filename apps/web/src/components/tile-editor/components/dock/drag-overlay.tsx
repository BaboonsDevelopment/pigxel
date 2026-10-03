"use client";

import { PANEL_LABELS } from "@/lib/editor-layout/layout";
import type { PanelDrag } from "./use-panel-drag";

/**
 * While a panel is dragged: the place it would land, lit up and gliding
 * from place to place, and a card with its name under the pointer.
 */
export function DragOverlay({ drag }: { drag: PanelDrag }) {
  if (!drag.dragging) return null;
  const { preview, pointer } = drag;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50">
      {preview && (
        <div
          style={preview.area}
          className="absolute rounded-md border-2 border-primary bg-primary/20 transition-all duration-150 ease-out"
        />
      )}
      {pointer && (
        <div
          style={{ left: pointer.x + 12, top: pointer.y + 12 }}
          className="absolute rounded-md border bg-background px-3 py-1.5 text-xs font-medium tracking-wide uppercase opacity-90 shadow-lg"
        >
          {PANEL_LABELS[drag.dragging]}
          {!preview && (
            <span className="ml-2 font-normal text-muted-foreground normal-case">
              drop on a panel or a dock
            </span>
          )}
        </div>
      )}
    </div>
  );
}
