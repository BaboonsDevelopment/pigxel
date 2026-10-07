"use client";

import { cn } from "@pigxel/ui/lib/utils";
import { NumericInput } from "./numeric-input";
import { CONVOLUTIONS, type ConvolutionPreset } from "../pixel-canvas/effects";

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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {CONVOLUTIONS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            aria-pressed={preset.matrix.every((v, i) => v === matrix[i])}
            onClick={() => onPreset(preset)}
            className={cn(
              "h-7 rounded-md border px-2.5 text-xs hover:bg-muted",
              "aria-pressed:border-foreground aria-pressed:bg-muted",
            )}
          >
            {preset.name}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <div className="grid w-40 grid-cols-3 gap-1">
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
                "h-8 rounded-md border bg-background px-1 text-center text-sm tabular-nums",
                i === 4 && "border-foreground/40 font-semibold",
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          Divided by {sum || 1}
          {!sum && " (the sum is 0)"}
        </p>
      </div>
    </div>
  );
}
