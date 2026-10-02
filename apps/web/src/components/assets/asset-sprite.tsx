import { cn } from "@pigxel/ui/lib/utils";
import { assetRuns, assetSize, type Asset } from "@/lib/assets/assets";

/**
 * An asset drawn crisp at any size, as one rectangle per run of same-colour
 * pixels; `repeat` lays it out that many times each way, as a tile meets its
 * neighbours. An animation plays by itself, one frame shown at a time; with
 * reduced motion it holds the first frame.
 */
export function AssetSprite({
  asset,
  animate = true,
  repeat = 1,
  className,
}: {
  asset: Asset;
  animate?: boolean;
  repeat?: number;
  className?: string;
}) {
  const { w, h } = assetSize(asset);
  const copies = Array.from({ length: repeat * repeat }, (_, i) => ({
    x: (i % repeat) * w,
    y: Math.floor(i / repeat) * h,
  }));
  const count = animate ? asset.frames.length : 1;
  const step = asset.duration ?? 100;
  const keyTimes = Array.from({ length: count }, (_, i) => i / count).join(";");
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${w * repeat} ${h * repeat}`}
      shapeRendering="crispEdges"
      className={cn(
        "motion-reduce:[&>g:first-of-type]:visible! motion-reduce:[&>g:not(:first-of-type)]:hidden",
        className,
      )}
    >
      {Array.from({ length: count }, (_, frame) => (
        <g key={frame} visibility={frame > 0 ? "hidden" : undefined}>
          {count > 1 && (
            <animate
              attributeName="visibility"
              values={Array.from({ length: count }, (_, i) =>
                i === frame ? "visible" : "hidden",
              ).join(";")}
              keyTimes={keyTimes}
              dur={`${step * count}ms`}
              calcMode="discrete"
              repeatCount="indefinite"
            />
          )}
          {copies.map((copy) =>
            assetRuns(asset, frame).map((run) => (
              <rect
                key={`${copy.x + run.x}-${copy.y + run.y}`}
                x={copy.x + run.x}
                y={copy.y + run.y}
                width={run.w}
                height={1}
                fill={run.color}
              />
            )),
          )}
        </g>
      ))}
    </svg>
  );
}
