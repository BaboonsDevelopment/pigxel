import type { CSSProperties } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { Asset } from "@/lib/assets/assets";

/**
 * An asset scaled up crisply from its 1× sheet. An animation plays with CSS,
 * stepping through the frames, and holds the first with reduced motion.
 * `repeat` lays a tile out 3 × 3, as it meets its neighbours.
 */
export function AssetImage({
  asset,
  repeat = false,
  className,
}: {
  asset: Pick<Asset, "sheetUrl" | "width" | "height" | "frames" | "frameMs">;
  repeat?: boolean;
  className?: string;
}) {
  const { sheetUrl, width, height, frames, frameMs } = asset;
  // A still tile repeats as a background; an animated one, as nine plays.
  if (repeat && frames === 1)
    return (
      <span
        aria-hidden="true"
        className={cn("block [image-rendering:pixelated]", className)}
        style={{
          aspectRatio: `${width} / ${height}`,
          backgroundImage: `url(${sheetUrl})`,
          backgroundSize: "calc(100% / 3) calc(100% / 3)",
        }}
      />
    );
  if (repeat)
    return (
      <span aria-hidden="true" className={cn("grid grid-cols-3", className)}>
        {Array.from({ length: 9 }, (_, i) => (
          <AssetImage key={i} asset={asset} />
        ))}
      </span>
    );
  return (
    <span
      aria-hidden="true"
      className={cn("relative block overflow-hidden", className)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a 1× pixel sheet, scaled by CSS */}
      <img
        src={sheetUrl}
        alt=""
        width={width * frames}
        height={height}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn(
          "absolute inset-y-0 left-0 h-full max-w-none [image-rendering:pixelated]",
          frames > 1 &&
            "animate-[sprite-sheet_var(--duration)_steps(var(--frames))_infinite] motion-reduce:animate-none",
        )}
        style={
          {
            width: `${frames * 100}%`,
            "--frames": frames,
            "--duration": `${frames * frameMs}ms`,
          } as CSSProperties
        }
      />
    </span>
  );
}
