import { IconButton } from "@pigxel/ui/components/button";
import { Input, Select } from "@pigxel/ui/components/input";
import { Text } from "@pigxel/ui/components/typography";
import { MAX_PEN_SIZE, MIN_PEN_SIZE } from "@/components/pixel-canvas/pen";

export function OptionSelect<T extends string>({
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
      <Text as="span" tone="muted">
        {label}
      </Text>
      <Select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </Select>
    </label>
  );
}

export function NumberOption({
  label,
  title,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  title: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-2" title={title}>
      <Text as="span" tone="muted">
        {label}
      </Text>
      <Input
        type="number"
        inputSize="sm"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-14 px-1 text-center tabular-nums"
      />
      {unit}
    </label>
  );
}

export function SizeField({
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
      <Text as="span" id="tool-size-label" tone="muted">
        {label}
      </Text>
      <IconButton
        label="Smaller"
        title="Smaller ([)"
        variant="secondary"
        disabled={value <= MIN_PEN_SIZE}
        onClick={() => onChange(value - 1)}
      >
        −
      </IconButton>
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
      <IconButton
        label="Bigger"
        title="Bigger (])"
        variant="secondary"
        disabled={value >= MAX_PEN_SIZE}
        onClick={() => onChange(value + 1)}
      >
        +
      </IconButton>
    </div>
  );
}
