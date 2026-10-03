import { Button, IconButton } from "@pigxel/ui/components/button";
import { CheckboxField } from "@pigxel/ui/components/choice";
import { Text } from "@pigxel/ui/components/typography";
import type { Stamp } from "@/components/pixel-canvas/paint";
import {
  clampOpacity,
  clampPenSize,
  clampTolerance,
} from "@/components/pixel-canvas/pen";
import type { Transform } from "@/components/pixel-canvas/use-selection";
import type { ToolOptionProps } from "../types";
import { NumberOption, OptionSelect, SizeField } from "./fields";

export function StampOption({ tool, stamp, onClearStamp }: ToolOptionProps) {
  if (!tool.stamp || !stamp) return null;
  return (
    <span className="flex items-center gap-2">
      <Text as="span" tone="muted">
        Brush
      </Text>
      <StampPreview stamp={stamp} />
      <IconButton label="Back to the normal brush" onClick={onClearStamp}>
        ✕
      </IconButton>
    </span>
  );
}

export function SizeOption({ tool, pen, onChange, stamp }: ToolOptionProps) {
  const size = tool.size;
  if (!size || (tool.stamp && stamp)) return null;
  return (
    <SizeField
      label={size.label ?? "Size"}
      value={pen[size.key]}
      onChange={(value) =>
        onChange({ ...pen, [size.key]: clampPenSize(value) })
      }
    />
  );
}

export function PixelPerfectOption({ pen, onChange }: ToolOptionProps) {
  return (
    <CheckboxField
      label="Pixel-perfect"
      title={
        pen.size > 1
          ? "Pixel-perfect works with a 1px pen"
          : "Removes the extra corner pixels from freehand lines"
      }
      checked={pen.pixelPerfect}
      disabled={pen.size > 1}
      onChange={(e) => onChange({ ...pen, pixelPerfect: e.target.checked })}
    />
  );
}

const INK_TITLES: Record<string, string> = {
  simple:
    "Paints the colour; a see-through colour lies over drawn pixels and goes on as it is where nothing is drawn",
  alpha:
    "Lays the colour over what is there, like glass: a second stroke makes it denser",
  copy: "Puts the colour exactly, see-through included: a low opacity cuts a see-through hole",
  lockAlpha:
    "Colours only what is drawn and keeps how opaque it is: recolour outlines without going outside them",
  shading:
    "Moves each pixel one step along the palette: left button forwards, right button back",
};

export function InkOption({ tool, pen, onChange, stamp }: ToolOptionProps) {
  if (tool.stamp && stamp) return null;
  return (
    <>
      <OptionSelect
        label="Ink"
        title={INK_TITLES[pen.ink] ?? ""}
        value={pen.ink}
        options={[
          ["simple", "Simple"],
          ["alpha", "Alpha compositing"],
          ["copy", "Copy color"],
          ["lockAlpha", "Lock alpha"],
          ["shading", "Shading"],
        ]}
        onChange={(ink) => onChange({ ...pen, ink })}
      />
      {pen.ink !== "shading" && (
        <NumberOption
          label="Opacity"
          title="How opaque the colour goes on, 0 (clear) to 255 (solid)"
          min={0}
          max={255}
          value={pen.opacity}
          onChange={(value) =>
            onChange({ ...pen, opacity: clampOpacity(value) })
          }
        />
      )}
    </>
  );
}

export function DitherOption({ pen, onChange }: ToolOptionProps) {
  return (
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
  );
}

export function FilledOption({ pen, onChange }: ToolOptionProps) {
  return (
    <CheckboxField
      label="Filled"
      checked={pen.fillShapes}
      onChange={(e) => onChange({ ...pen, fillShapes: e.target.checked })}
    />
  );
}

export function ContiguousOption({ pen, onChange }: ToolOptionProps) {
  return (
    <CheckboxField
      label="Contiguous"
      title="Off: takes every pixel of the clicked colour, connected or not"
      checked={pen.contiguous}
      onChange={(e) => onChange({ ...pen, contiguous: e.target.checked })}
    />
  );
}

export function ToleranceOption({ pen, onChange }: ToolOptionProps) {
  return (
    <NumberOption
      label="Tolerance"
      title="0 takes only the exact colour; higher also takes shades close to it (each of red, green, blue and alpha at most this far off). Try 20–40 on pictures from the AI"
      min={0}
      max={255}
      value={pen.tolerance}
      onChange={(value) =>
        onChange({ ...pen, tolerance: clampTolerance(value) })
      }
    />
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
    title: "Rotate 90° to the right",
    icon: "↻",
  },
];

export function SelectionActions({
  tool,
  selection,
  onUseAsBrush,
}: ToolOptionProps) {
  const transforms = selection.mask !== null || tool.wholeLayer;
  if (!transforms || !(tool.selects || selection.mask)) return null;
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Selection"
    >
      {TRANSFORMS.map(({ kind, label, title, icon }) => (
        <IconButton
          key={kind}
          label={label}
          title={title}
          variant="secondary"
          onClick={() => selection.transform(kind)}
        >
          {icon}
        </IconButton>
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
  );
}

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
