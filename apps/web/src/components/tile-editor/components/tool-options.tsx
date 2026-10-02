import { Button } from "@pigxel/ui/components/button";
import { Checkbox } from "@pigxel/ui/components/choice";
import { Input } from "@pigxel/ui/components/input";
import type { Stamp } from "@/components/pixel-canvas/paint";
import {
  MAX_PEN_SIZE,
  MAX_SPRAY_SPEED,
  MIN_PEN_SIZE,
  MIN_SPRAY_SPEED,
  clampPenSize,
  type PenSettings,
} from "@/components/pixel-canvas/pen";
import type {
  SelectionApi,
  Transform,
} from "@/components/pixel-canvas/use-selection";
import type { CanvasView } from "@/components/pixel-canvas/view";
import type { ToolId } from "../constants";
import { sizeKey } from "../helpers";

/** The settings of the selected tool, shown above the canvas, and the canvas-wide modes. */
export function ToolOptions({
  tool,
  pen,
  onChange,
  selection,
  view,
  onViewChange,
  stamp,
  onClearStamp,
  onUseAsBrush,
}: {
  tool: ToolId;
  pen: PenSettings;
  onChange: (pen: PenSettings) => void;
  selection: SelectionApi;
  view: CanvasView;
  onViewChange: (view: CanvasView) => void;
  /** The picture brush, when one is in use. */
  stamp: Stamp | null;
  onClearStamp: () => void;
  onUseAsBrush: () => void;
}) {
  const key = sizeKey(tool);
  const selectionTool =
    tool === "marquee" ||
    tool === "ellipseMarquee" ||
    tool === "lasso" ||
    tool === "polygonLasso" ||
    tool === "wand" ||
    tool === "move";
  // The Move tool flips and turns the whole layer when nothing is selected.
  const transforms = selection.mask !== null || tool === "move";
  const inkTool = tool === "pen" || tool === "brush";
  const paints =
    inkTool ||
    [
      "spray",
      "contour",
      "polygon",
      "eraser",
      "line",
      "curve",
      "rect",
      "ellipse",
      "bucket",
    ].includes(tool);
  return (
    <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {inkTool && stamp && (
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">Brush</span>
          <StampPreview stamp={stamp} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title="Back to the normal brush"
            onClick={onClearStamp}
          >
            ✕
          </Button>
        </span>
      )}

      {key && !(inkTool && stamp) && (
        <SizeField
          label={
            tool === "brush"
              ? "Brush size"
              : tool === "spray"
                ? "Width"
                : "Size"
          }
          value={pen[key]}
          onChange={(size) => onChange({ ...pen, [key]: clampPenSize(size) })}
        />
      )}

      {tool === "spray" && (
        <label
          className="flex items-center gap-2"
          title="How fast dots appear while you hold the button"
        >
          <span className="text-muted-foreground">Speed</span>
          <Input
            type="number"
            inputSize="sm"
            min={MIN_SPRAY_SPEED}
            max={MAX_SPRAY_SPEED}
            value={pen.spraySpeed}
            onChange={(e) =>
              onChange({
                ...pen,
                spraySpeed: Math.max(
                  MIN_SPRAY_SPEED,
                  Math.min(
                    MAX_SPRAY_SPEED,
                    Math.round(Number(e.target.value) || MIN_SPRAY_SPEED),
                  ),
                ),
              })
            }
            className="w-14 px-1 text-center tabular-nums"
          />
        </label>
      )}

      {(tool === "pen" || tool === "curve") && (
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

      {((inkTool && !stamp) ||
        tool === "spray" ||
        tool === "contour" ||
        tool === "polygon") && (
        <OptionSelect
          label="Ink"
          title="Shading moves each pixel one step along the palette: left button forwards, right button back"
          value={pen.ink}
          options={[
            ["simple", "Simple"],
            ["shading", "Shading"],
          ]}
          onChange={(ink) => onChange({ ...pen, ink })}
        />
      )}

      {paints && (
        <OptionSelect
          label="Dither"
          title="Paints only part of the area, in an even pattern"
          value={String(pen.density)}
          options={[
            ["100", "Solid"],
            ["75", "75%"],
            ["50", "50%"],
            ["25", "25%"],
          ]}
          onChange={(density) => onChange({ ...pen, density: Number(density) })}
        />
      )}

      {(tool === "rect" || tool === "ellipse") && (
        <label className="flex items-center gap-2">
          <Checkbox
            checked={pen.fillShapes}
            onChange={(e) => onChange({ ...pen, fillShapes: e.target.checked })}
          />
          Filled
        </label>
      )}

      {tool === "gradient" && (
        <>
          <OptionSelect
            label="Shape"
            title="Linear runs along the line; radial spreads out from where you start"
            value={pen.gradientShape}
            options={[
              ["linear", "Linear"],
              ["radial", "Radial"],
            ]}
            onChange={(gradientShape) => onChange({ ...pen, gradientShape })}
          />
          <OptionSelect
            label="Dither"
            title="A dither keeps to the two colours; Smooth mixes them into new shades"
            value={pen.gradientDither}
            options={[
              ["bayer4", "Ordered 4×4"],
              ["bayer8", "Ordered 8×8"],
              ["none", "Smooth"],
            ]}
            onChange={(gradientDither) => onChange({ ...pen, gradientDither })}
          />
        </>
      )}

      {(tool === "bucket" || tool === "wand") && (
        <label
          className="flex items-center gap-2"
          title="Off: takes every pixel of the clicked colour, connected or not"
        >
          <Checkbox
            checked={pen.contiguous}
            onChange={(e) => onChange({ ...pen, contiguous: e.target.checked })}
          />
          Contiguous
        </label>
      )}

      {(selectionTool || selection.mask) && transforms && (
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Selection"
        >
          {TRANSFORMS.map(({ kind, label, title, icon }) => (
            <Button
              key={kind}
              type="button"
              variant="secondary"
              size="icon"
              aria-label={label}
              title={title}
              onClick={() => selection.transform(kind)}
            >
              {icon}
            </Button>
          ))}
          {selection.mask && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Paint with the selected pixels"
              onClick={onUseAsBrush}
            >
              Use as brush
            </Button>
          )}
          {selection.mask && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Deselect (Ctrl+D)"
              onClick={selection.deselect}
            >
              Deselect
            </Button>
          )}
        </div>
      )}

      <p className="min-w-0 flex-1 text-xs text-muted-foreground">
        {HINTS[tool]}
      </p>

      <div className="flex items-center gap-4">
        <OptionSelect
          label="Mirror"
          title="Draws mirror copies across the middle of the tile"
          value={view.symmetry}
          options={[
            ["none", "Off"],
            ["horizontal", "Left ↔ right"],
            ["vertical", "Top ↕ bottom"],
            ["both", "Both"],
          ]}
          onChange={(symmetry) => onViewChange({ ...view, symmetry })}
        />
        <OptionSelect
          label="Tiled"
          title="Repeats the tile around itself; strokes wrap across the edges"
          value={view.tiled}
          options={[
            ["none", "Off"],
            ["x", "Across"],
            ["y", "Down"],
            ["both", "Both"],
          ]}
          onChange={(tiled) => onViewChange({ ...view, tiled })}
        />
      </div>
    </div>
  );
}

const TRANSFORMS: {
  kind: Transform;
  label: string;
  title: string;
  icon: string;
}[] = [
  {
    kind: "flipHorizontal",
    label: "Flip horizontally",
    title: "Flip horizontally (Shift+H)",
    icon: "⇋",
  },
  {
    kind: "flipVertical",
    label: "Flip vertically",
    title: "Flip vertically (Shift+V)",
    icon: "⇵",
  },
  {
    kind: "rotateLeft",
    label: "Rotate left",
    title: "Rotate 90° to the left",
    icon: "↺",
  },
  {
    kind: "rotateRight",
    label: "Rotate right",
    title: "Rotate 90° to the right (Shift+R)",
    icon: "↻",
  },
];

const PAINT_HINT =
  "Right button paints the secondary colour · Shift+click draws a line · Alt+click picks a colour · F3 onion skin";

/** The picture brush, small, on a checkerboard. */
function StampPreview({ stamp }: { stamp: Stamp }) {
  return (
    <canvas
      aria-label={`Picture brush, ${stamp.w} × ${stamp.h}`}
      width={stamp.w}
      height={stamp.h}
      className="h-7 max-w-16 rounded border bg-checker object-contain [image-rendering:pixelated]"
      ref={(canvas) =>
        canvas
          ?.getContext("2d")
          ?.putImageData(
            new ImageData(
              new Uint8ClampedArray(
                stamp.pixels,
              ) as Uint8ClampedArray<ArrayBuffer>,
              stamp.w,
              stamp.h,
            ),
            0,
            0,
          )
      }
    />
  );
}
const SELECT_HINT =
  "Shift adds · Alt takes away · Drag the selection to move it · Ctrl+C / X / V";

const HINTS: Record<ToolId, string> = {
  pen: PAINT_HINT,
  brush: PAINT_HINT,
  spray:
    "Hold to scatter dots; the longer you hold, the denser · Right button sprays the secondary colour · Alt+click picks a colour",
  contour:
    "Draw around a shape; it closes and fills as you go · Right button fills with the secondary colour · Alt+click picks a colour",
  polygon:
    "Click to place corners · Click the first one, double-click or Enter fills it · Shift snaps to 45° · Esc cancels · Right button uses the secondary colour",
  eraser:
    "Reveals the background · Shift+click erases a line · Alt+click picks a colour",
  line: "Drag to draw · Shift snaps to 45° · Right button uses the secondary colour",
  curve:
    "Drag the ends, then drag to bend it, then drag again to bend its far end · Enter keeps it as it is · Esc cancels",
  rect: "Drag to draw · Shift makes a square · Right button uses the secondary colour",
  ellipse:
    "Drag to draw · Shift makes a circle · Right button uses the secondary colour",
  bucket: "Click fills · Right-click fills with the secondary colour",
  gradient:
    "Drag from the primary colour to the secondary · Fills the selection, or the whole layer · Shift snaps to 45° · Right button swaps the colours",
  pipette: "Click picks the primary colour · Right-click the secondary",
  marquee: SELECT_HINT,
  ellipseMarquee: `Shift while dragging makes a circle · ${SELECT_HINT}`,
  lasso: `Draw around the pixels · ${SELECT_HINT}`,
  polygonLasso:
    "Click to place corners · Click the first one, double-click or Enter closes · Esc cancels · Shift adds · Alt takes away",
  wand: "Click selects a colour area · Shift adds · Alt takes away",
  move: "Drag moves the selection, or the whole layer · Arrow keys nudge · Enter drops",
};

function OptionSelect<T extends string>({
  label,
  title,
  value,
  options,
  onChange,
}: {
  label: string;
  title: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex items-center gap-2" title={title}>
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-8 rounded-md border bg-background px-2 text-sm"
      >
        {options.map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

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
