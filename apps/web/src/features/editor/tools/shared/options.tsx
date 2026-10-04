import { useState } from "react";
import { Button, IconButton } from "@pigxel/ui/components/button";
import { CheckboxField } from "@pigxel/ui/components/choice";
import { Text } from "@pigxel/ui/components/typography";
import type { Stamp } from "../../pixel-canvas/paint";
import {
  MAX_STABILIZER,
  clampOpacity,
  clampPenSize,
  clampStabilizer,
  clampTolerance,
} from "../../pixel-canvas/pen";
import type { Transform } from "../../pixel-canvas/use-selection";
import type { ToolOptionProps } from "../types";
import { fitsLibrary, sameStamp, type SavedBrush } from "../../brush-library";
import { NumberOption, OptionSelect, SizeField } from "./fields";

export function StampOption({
  tool,
  pen,
  onChange,
  stamp,
  onClearStamp,
  brushes,
  onSaveBrush,
  onPickBrush,
  onRemoveBrush,
}: ToolOptionProps) {
  if (!tool.stamp || (!stamp && !brushes.length)) return null;
  const saved = stamp && brushes.some((b) => sameStamp(b.stamp, stamp));
  return (
    <span className="flex items-center gap-2">
      <Text as="span" tone="muted">
        Brush
      </Text>
      {stamp && <StampPreview stamp={stamp} />}
      {stamp && !saved && fitsLibrary(stamp) && (
        <Button size="sm" variant="ghost" onClick={onSaveBrush}>
          Save
        </Button>
      )}
      <BrushLibrary
        brushes={brushes}
        onPick={onPickBrush}
        onRemove={onRemoveBrush}
      />
      {stamp && (
        <CheckboxField
          label="Pattern"
          title="Paints the brush as a texture fixed to the tile, so strokes join up seamlessly"
          checked={pen.stampPattern}
          onChange={(e) => onChange({ ...pen, stampPattern: e.target.checked })}
        />
      )}
      {stamp && (
        <IconButton label="Back to the normal brush" onClick={onClearStamp}>
          ✕
        </IconButton>
      )}
    </span>
  );
}

function BrushLibrary({
  brushes,
  onPick,
  onRemove,
}: {
  brushes: SavedBrush[];
  onPick: (stamp: Stamp) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!brushes.length) return null;
  return (
    <span className="relative">
      <Button
        size="sm"
        variant="secondary"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Saved ({brushes.length}) ▾
      </Button>
      {open && (
        <span className="absolute top-full left-0 z-50 mt-1 grid w-64 grid-cols-4 gap-1 rounded-lg border bg-background p-2 shadow-lg">
          {brushes.map((brush) => (
            <span key={brush.id} className="group relative">
              <button
                type="button"
                aria-label={`Use brush ${brush.stamp.w} × ${brush.stamp.h}`}
                onClick={() => {
                  onPick(brush.stamp);
                  setOpen(false);
                }}
                className="grid h-12 w-full place-items-center rounded-md border hover:bg-muted"
              >
                <StampPreview stamp={brush.stamp} />
              </button>
              <button
                type="button"
                aria-label="Remove this brush"
                onClick={() => onRemove(brush.id)}
                className="absolute -top-1 -right-1 hidden size-4 place-items-center rounded-full bg-foreground text-[10px] leading-none text-background group-hover:grid"
              >
                ×
              </button>
            </span>
          ))}
        </span>
      )}
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

export function StabilizerOption({ pen, onChange }: ToolOptionProps) {
  return (
    <NumberOption
      label="Stabilizer"
      title="The line follows the pointer on a string this many pixels long, smoothing out a shaky hand. 0 is off"
      min={0}
      max={MAX_STABILIZER}
      value={pen.stabilizer}
      onChange={(value) =>
        onChange({ ...pen, stabilizer: clampStabilizer(value) })
      }
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
