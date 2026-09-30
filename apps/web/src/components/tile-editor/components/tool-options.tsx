import { Button } from "@pigxel/ui/components/button";
import { Checkbox } from "@pigxel/ui/components/choice";
import { Input } from "@pigxel/ui/components/input";
import {
  MAX_PEN_SIZE,
  MIN_PEN_SIZE,
  clampPenSize,
  type PenSettings,
} from "@/components/pixel-canvas/pen";
import type { ToolId } from "../constants";
import { sizeKey } from "../helpers";

/** The settings of the selected tool, shown above the canvas. */
export function ToolOptions({
  tool,
  pen,
  onChange,
}: {
  tool: ToolId;
  pen: PenSettings;
  onChange: (pen: PenSettings) => void;
}) {
  const key = sizeKey(tool);
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

      {key && (
        <SizeField
          label={tool === "brush" ? "Brush size" : "Size"}
          value={pen[key]}
          onChange={(size) => onChange({ ...pen, [key]: clampPenSize(size) })}
        />
      )}

      {tool === "pen" && (
        <label
          className="flex items-center gap-2 has-disabled:opacity-50"
          title={
            pen.size > 1
              ? "Pixel-perfect works with a 1px pen"
              : "Removes the extra corner pixels from freehand lines"
          }
        >
          <Checkbox
            checked={pen.pixelPerfect}
            disabled={pen.size > 1}
            onChange={(e) =>
              onChange({ ...pen, pixelPerfect: e.target.checked })
            }
          />
          Pixel-perfect
        </label>
      )}

      {tool === "bucket" && (
        <label
          className="flex items-center gap-2"
          title="Off: fills every pixel of the clicked colour, connected or not"
        >
          <Checkbox
            checked={pen.contiguous}
            onChange={(e) => onChange({ ...pen, contiguous: e.target.checked })}
          />
          Contiguous
        </label>
      )}

      <p className="text-xs text-muted-foreground">{HINTS[tool]}</p>
    </div>
  );
}

const HINTS: Record<ToolId, string> = {
  pen: "Right-click erases · Shift+click draws a line · Alt+click picks a color",
  brush:
    "Right-click erases · Shift+click draws a line · Alt+click picks a color",
  eraser:
    "Reveals the background · Shift+click erases a line · Alt+click picks a color",
  line: "Drag to draw · Shift snaps to 45° · Right-drag erases",
  bucket: "Click fills · Right-click fills with the background",
  pipette: "Click a pixel to pick its color",
};

function SizeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (size: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span id="tool-size-label" className="text-muted-foreground">
        {label}
      </span>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Smaller"
        title="Smaller ([)"
        disabled={value <= MIN_PEN_SIZE}
        onClick={() => onChange(value - 1)}
      >
        −
      </Button>
      <Input
        type="number"
        inputSize="sm"
        aria-labelledby="tool-size-label"
        min={MIN_PEN_SIZE}
        max={MAX_PEN_SIZE}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || MIN_PEN_SIZE)}
        className="w-12 px-1 text-center tabular-nums"
      />
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Bigger"
        title="Bigger (])"
        disabled={value >= MAX_PEN_SIZE}
        onClick={() => onChange(value + 1)}
      >
        +
      </Button>
    </div>
  );
}
