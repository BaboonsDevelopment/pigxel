import type { PanelRow } from "@/lib/layers/tree";
import type { Place } from "@/lib/layers/types";

/** Where a dragged layer lands relative to the row under the pointer. */
export type DropZone = "above" | "below" | "into";

/**
 * The zone of a row the pointer is over: its top or bottom half, or for a
 * group also its middle, which drops the layer inside the group.
 */
export function zoneAt(
  e: React.DragEvent<HTMLElement>,
  row: PanelRow,
): DropZone {
  const box = e.currentTarget.getBoundingClientRect();
  const at = (e.clientY - box.top) / box.height;
  if (row.layer.kind === "group")
    return at < 0.25 ? "above" : at > 0.75 ? "below" : "into";
  return at < 0.5 ? "above" : "below";
}

/**
 * The tree place for a drop. The panel lists layers top to bottom while the
 * tree counts from the bottom, so "above" a row is one index higher.
 */
export function dropPlace(row: PanelRow, zone: DropZone): Place {
  if (zone === "into" && row.layer.kind === "group")
    return { parentId: row.layer.id, index: row.layer.children.length };
  return {
    parentId: row.parentId,
    index: zone === "above" ? row.index + 1 : row.index,
  };
}
