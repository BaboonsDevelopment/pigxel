import type { Point } from "../pixel-canvas/pen";

export function PointerPosition({ point }: { point: Point | null }) {
  return (
    <div
      aria-label="Pointer position in pixels"
      className="pointer-events-none mt-1 ml-auto w-fit rounded border bg-background/90 px-2 py-1 text-right text-xs text-muted-foreground shadow-sm tabular-nums"
    >
      x: {point?.x ?? "—"}, y: {point?.y ?? "—"} px
    </div>
  );
}
