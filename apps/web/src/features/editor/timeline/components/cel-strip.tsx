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
  isLinked,
  onSelect,
  onContextMenu,
}: {
  layer: Layer;
  frames: Frame[];
  frameId: string;
  activeLayer: boolean;
  hasCel: (frameId: string) => boolean;
  isLinked: (frameId: string) => boolean;
  onSelect: (frameId: string) => void;
  onContextMenu: (frameId: string, event: React.MouseEvent) => void;
}) {
  return frames.map((frame) => {
    const current = frame.id === frameId;
    const filled = layer.kind !== "group" && hasCel(frame.id);
    const linked = isLinked(frame.id);
    return (
      <button
        key={frame.id}
        type="button"
        disabled={layer.kind === "group"}
        aria-label={`Frame ${frames.indexOf(frame) + 1}${linked ? ", linked cel" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(frame.id);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onContextMenu(frame.id, event);
        }}
        className={cn(
          "flex shrink-0 items-center justify-center border-r",
          FRAME_COLUMN,
          current && "bg-primary/10",
          current && activeLayer && "ring-2 ring-primary ring-inset",
        )}
      >
        {layer.kind !== "group" &&
          (linked ? (
            <svg
              viewBox="0 0 16 16"
              className="size-3.5 text-primary"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 5H5a3 3 0 0 0 0 6h2m2-6h2a3 3 0 1 1 0 6h-1M5.5 8h5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          ) : filled ? (
            <span className="size-2.5 rounded-full bg-foreground/70" />
          ) : (
            <span className="size-2 rounded-full border border-muted-foreground/50" />
          ))}
      </button>
    );
  });
}
