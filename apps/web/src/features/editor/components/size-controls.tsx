"use client";

import { Input } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";

export const SIZE_LABEL = "mb-2 block text-sm font-semibold";

export function SizeField({
  id,
  label,
  value,
  unit,
  min = 1,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  unit: string;
  min?: number | null;
  /** Shown greyed out while the field is empty. */
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={SIZE_LABEL}>
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min ?? undefined}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-14 rounded-xl px-5 pr-12 text-base tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-sm text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

export function LockSwitch({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full transition-colors",
          on ? "bg-pink-strong" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-1 grid size-6 place-items-center rounded-full bg-background shadow-sm transition-[left]",
            on ? "left-7" : "left-1",
          )}
        >
          {on && (
            <PixelImage
              src="/art/icons/lock-icon.png"
              alt=""
              width={18}
              height={18}
              className="size-[18px]"
            />
          )}
        </span>
      </button>
      <span className="text-base">{label}</span>
    </label>
  );
}
