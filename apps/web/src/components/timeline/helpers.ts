import type { PanelRow } from "@/lib/layers/tree";
import type { Place } from "@/lib/layers/types";
import type { DropZone, FrameSide } from "./constants";

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

export function dropPlace(row: PanelRow, zone: DropZone): Place {
  if (zone === "into" && row.layer.kind === "group")
    return { parentId: row.layer.id, index: row.layer.children.length };
  return {
    parentId: row.parentId,
    index: zone === "above" ? row.index + 1 : row.index,
  };
}

export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export function sideAt(e: React.DragEvent<HTMLElement>): FrameSide {
  const box = e.currentTarget.getBoundingClientRect();
  return e.clientX - box.left < box.width / 2 ? "before" : "after";
}

export function frameDropIndex(from: number, to: number, side: FrameSide) {
  const at = side === "before" ? to : to + 1;
  return from < at ? at - 1 : at;
}
