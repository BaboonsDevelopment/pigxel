import {
  MAX_PEN_SIZE,
  MIN_PEN_SIZE,
  clampPenSize,
  type PenSettings,
} from "@/components/pixel-canvas/pen";

const stepButton =
  "flex size-8 items-center justify-center rounded-md border text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

export function PenOptions({
  pen,
  onChange,
}: {
  pen: PenSettings;
  onChange: (pen: PenSettings) => void;
}) {
  const setSize = (size: number) =>
    onChange({ ...pen, size: clampPenSize(size) });
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">Color</span>
        <input
          type="color"
          value={pen.color}
          onChange={(e) => onChange({ ...pen, color: e.target.value })}
          className="h-8 w-10 cursor-pointer rounded-md border bg-background p-0.5"
        />
        <span className="font-mono text-xs uppercase tabular-nums">
          {pen.color}
        </span>
      </label>

      <div className="flex items-center gap-2">
        <span id="pen-size-label" className="text-muted-foreground">
          Size
        </span>
        <button
          type="button"
          aria-label="Smaller brush"
          title="Smaller brush ([)"
          className={stepButton}
          disabled={pen.size <= MIN_PEN_SIZE}
          onClick={() => setSize(pen.size - 1)}
        >
          −
        </button>
        <input
          type="number"
          aria-labelledby="pen-size-label"
          min={MIN_PEN_SIZE}
          max={MAX_PEN_SIZE}
          value={pen.size}
          onChange={(e) => setSize(Number(e.target.value) || MIN_PEN_SIZE)}
          className="h-8 w-12 rounded-md border bg-background text-center tabular-nums"
        />
        <button
          type="button"
          aria-label="Bigger brush"
          title="Bigger brush (])"
          className={stepButton}
          disabled={pen.size >= MAX_PEN_SIZE}
          onClick={() => setSize(pen.size + 1)}
        >
          +
        </button>
      </div>

      <label
        className="flex items-center gap-2 has-disabled:opacity-50"
        title={
          pen.size > 1
            ? "Pixel-perfect works with a 1px brush"
            : "Removes the extra corner pixels from freehand lines"
        }
      >
        <input
          type="checkbox"
          checked={pen.pixelPerfect}
          disabled={pen.size > 1}
          onChange={(e) => onChange({ ...pen, pixelPerfect: e.target.checked })}
          className="size-4 accent-primary"
        />
        Pixel-perfect
      </label>
    </div>
  );
}
