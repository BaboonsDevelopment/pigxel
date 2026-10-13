"use client";

import { cn } from "@pigxel/ui/lib/utils";
import { NumericInput } from "./numeric-input";
import { CONVOLUTIONS, type ConvolutionPreset } from "../pixel-canvas/effects";
import { SIZE_LABEL } from "./size-controls";

const MAX_WEIGHT = 99;

export function MatrixEditor({
  matrix,
  onChange,
  onPreset,
}: {
  matrix: number[];
  onChange: (matrix: number[]) => void;
  onPreset: (preset: ConvolutionPreset) => void;
}) {
  const sum = matrix.reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-4">
      <fieldset>
        <legend className={SIZE_LABEL}>Preset</legend>
        <div className="grid grid-cols-3 gap-2">
          {CONVOLUTIONS.map((preset) => {
            const on = preset.matrix.every((v, i) => v === matrix[i]);
            return (
              <button
                key={preset.name}
                type="button"
                aria-pressed={on}
                onClick={() => onPreset(preset)}
                className={cn(
                  "h-10 rounded-xl border px-3 text-sm transition-colors",
                  on
                    ? "border-primary-soft bg-pastel-pink-soft font-semibold"
                    : "bg-background hover:bg-pink-base",
                )}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className={SIZE_LABEL}>Weights</legend>
        <div className="flex items-center justify-center gap-6 rounded-xl border p-4">
          <div className="grid grid-cols-3 gap-2">
            {matrix.map((value, i) => (
              <NumericInput
                key={i}
                aria-label={`Weight ${Math.floor(i / 3) + 1}, ${(i % 3) + 1}`}
                min={-MAX_WEIGHT}
                max={MAX_WEIGHT}
                value={value}
                onValueChange={(next) =>
                  onChange(
                    matrix.map((v, j) =>
                      j === i
                        ? Math.min(
                            MAX_WEIGHT,
                            Math.max(-MAX_WEIGHT, Math.round(next) || 0),
                          )
                        : v,
                    ),
                  )
                }
                className={cn(
                  "size-12 rounded-xl border border-input bg-background text-center text-base tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                  i === 4 && "border-pink-strong font-semibold",
                )}
              />
            ))}
          </div>
          <div className="grid justify-items-center gap-1 border-l pl-6 text-center">
            <span className="text-xs text-muted-foreground">Divided by</span>
            <span className="text-2xl font-semibold tabular-nums">
              {sum || 1}
            </span>
            {!sum && (
              <span className="text-[11px] text-muted-foreground">
                the sum is 0
              </span>
            )}
          </div>
        </div>
      </fieldset>
    </div>
  );
}
