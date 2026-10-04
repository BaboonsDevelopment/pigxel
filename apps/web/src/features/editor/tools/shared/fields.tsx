import { IconButton } from "@pigxel/ui/components/button";
import { Input } from "@pigxel/ui/components/input";
import { NumericInput } from "../../components/numeric-input";
import { EditorSelect } from "../../components/editor-select";
import { Text } from "@pigxel/ui/components/typography";
import { MAX_PEN_SIZE, MIN_PEN_SIZE } from "../../pixel-canvas/pen";

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
      <EditorSelect
        value={value}
        onChange={(next) => onChange(next as T)}
        options={options.map(([option, text]) => ({
          value: option,
          label: text,
        }))}
      />
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
      <NumericInput
        as={Input}
        inputSize="sm"
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={onChange}
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
      <NumericInput
        as={Input}
        inputSize="sm"
        aria-labelledby="tool-size-label"
        min={MIN_PEN_SIZE}
        max={MAX_PEN_SIZE}
        value={value}
        onValueChange={(next) => onChange(next || MIN_PEN_SIZE)}
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
