import { cn } from "@pigxel/ui/lib/utils";
import type { Layer } from "@/lib/layers/types";
import type { Frame } from "@/lib/sprite/types";
import { FRAME_COLUMN } from "../constants";

export function CelStrip({
  layer,
  frames,
  frameId,
  activeLayer,
  hasCel,
  onSelect,
}: {
  layer: Layer;
  frames: Frame[];
  frameId: string;
  activeLayer: boolean;
  hasCel: (frameId: string) => boolean;
  onSelect: (frameId: string) => void;
}) {
  return frames.map((frame) => {
    const current = frame.id === frameId;
    const filled = layer.kind !== "group" && hasCel(frame.id);
    return (
      <button
        key={frame.id}
        type="button"
        disabled={layer.kind === "group"}
        aria-label={`Frame ${frames.indexOf(frame) + 1}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(frame.id);
        }}
        onContextMenu={() => onSelect(frame.id)}
        className={cn(
          "flex shrink-0 items-center justify-center border-r",
          FRAME_COLUMN,
          current && "bg-primary/10",
          current && activeLayer && "ring-2 ring-primary ring-inset",
        )}
      >
        {layer.kind !== "group" &&
          (filled ? (
            <span className="size-2.5 rounded-full bg-foreground/70" />
          ) : (
            <span className="size-2 rounded-full border border-muted-foreground/50" />
          ))}
      </button>
    );
  });
}
