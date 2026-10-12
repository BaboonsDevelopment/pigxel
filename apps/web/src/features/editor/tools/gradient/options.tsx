import type { ToolOptionProps } from "../types";
import { OptionSelect } from "../shared/fields";
import { CheckboxField } from "@pigxel/ui/components/choice";

export function GradientOptions({
  pen,
  onChange,
  palette = [],
}: ToolOptionProps) {
  return (
    <>
      <CheckboxField
        label="Palette only"
        checked={pen.gradientPaletteOnly}
        onChange={(e) =>
          onChange({ ...pen, gradientPaletteOnly: e.target.checked })
        }
      />
      {pen.gradientPaletteOnly && (
        <span className="text-xs text-muted-foreground">
          {palette.length
            ? "Uses palette order; no new colours"
            : "Add palette colours to draw a gradient"}
        </span>
      )}
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
        title={
          pen.gradientPaletteOnly
            ? "Ordered modes dither palette colours; Steps uses solid palette bands"
            : "A dither keeps to the gradient colours; Smooth mixes adjacent colours into new shades"
        }
        value={pen.gradientDither}
        options={[
          ["bayer4", "Ordered 4×4"],
          ["bayer8", "Ordered 8×8"],
          ["none", pen.gradientPaletteOnly ? "Steps" : "Smooth"],
        ]}
        onChange={(gradientDither) => onChange({ ...pen, gradientDither })}
      />
      {!pen.gradientPaletteOnly && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground">Colours</span>
          <span
            title="Primary colour"
            className="size-6 rounded border"
            style={{ backgroundColor: pen.color }}
          />
          {pen.gradientColors.map((color, index) => (
            <span key={index} className="flex items-center gap-0.5">
              <input
                type="color"
                aria-label={`Gradient colour ${index + 2}`}
                value={color.slice(0, 7)}
                onChange={(e) =>
                  onChange({
                    ...pen,
                    gradientColors: pen.gradientColors.map((old, i) =>
                      i === index ? e.target.value : old,
                    ),
                  })
                }
                className="size-6 cursor-pointer rounded border bg-transparent p-0"
              />
              <button
                type="button"
                aria-label={`Remove gradient colour ${index + 2}`}
                title="Remove colour"
                onClick={() =>
                  onChange({
                    ...pen,
                    gradientColors: pen.gradientColors.filter(
                      (_, i) => i !== index,
                    ),
                  })
                }
                className="rounded px-1 text-xs text-muted-foreground hover:bg-muted"
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            aria-label="Add gradient colour"
            title="Add an intermediate colour"
            disabled={pen.gradientColors.length >= 14}
            onClick={() =>
              onChange({
                ...pen,
                gradientColors: [...pen.gradientColors, pen.color.slice(0, 7)],
              })
            }
            className="size-6 rounded border hover:bg-muted disabled:opacity-40"
          >
            +
          </button>
          <span
            title="Secondary colour"
            className="size-6 rounded border"
            style={{ backgroundColor: pen.secondary }}
          />
        </div>
      )}
    </>
  );
}
