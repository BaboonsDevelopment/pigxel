"use client";

import { useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { Frame } from "@/lib/sprite/types";
import { FRAME_COLUMN, LAYER_COLUMN, type FrameSide } from "../constants";
import { frameDropIndex, sideAt } from "../helpers";

export function FrameHeader({
  frames,
  frameId,
  onSelect,
  onMove,
  onContextMenu,
}: {
  frames: Frame[];
  frameId: string;
  onSelect: (id: string) => void;
  onMove: (id: string, index: number) => void;
  onContextMenu: (id: string, e: React.MouseEvent) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<{ index: number; side: FrameSide } | null>(
    null,
  );

  const endDrag = () => {
    setDragging(null);
    setOver(null);
  };

  return (
    <div className="sticky top-0 z-20 flex h-7 border-b bg-background text-xs">
      <div
        className={cn(
          "sticky left-0 z-10 flex shrink-0 items-center border-r bg-background px-3 text-muted-foreground",
          LAYER_COLUMN,
        )}
      >
        Frames
      </div>
      {frames.map((frame, index) => (
        <button
          key={frame.id}
          type="button"
          draggable
          title={`Frame ${index + 1} · ${frame.duration} ms`}
          onClick={() => onSelect(frame.id)}
          onContextMenu={(e) => onContextMenu(frame.id, e)}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            setDragging(index);
          }}
          onDragOver={(e) => {
            if (dragging === null) return;
            e.preventDefault();
            setOver({ index, side: sideAt(e) });
          }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            if (dragging !== null && over)
              onMove(
                frames[dragging]!.id,
                frameDropIndex(dragging, over.index, over.side),
              );
            endDrag();
          }}
          onDragEnd={endDrag}
          className={cn(
            "flex shrink-0 cursor-default items-center justify-center border-r tabular-nums",
            FRAME_COLUMN,
            frame.id === frameId
              ? "bg-primary font-semibold text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
            over?.index === index &&
              (over.side === "before"
                ? "shadow-[inset_2px_0_0_var(--color-primary)]"
                : "shadow-[inset_-2px_0_0_var(--color-primary)]"),
          )}
        >
          {index + 1}
        </button>
      ))}
    </div>
  );
}
