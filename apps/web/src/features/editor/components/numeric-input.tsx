"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ElementType,
} from "react";

export function NumericInput({
  value,
  onValueChange,
  as: Field = "input",
  inputSize,
  onBlur,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
  as?: ElementType;
  inputSize?: "sm" | "md" | "lg";
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  return (
    <Field
      {...props}
      {...(inputSize ? { inputSize } : {})}
      type="number"
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        const next = event.currentTarget.value;
        setText(next);
        if (next !== "" && Number.isFinite(Number(next)))
          onValueChange(Number(next));
      }}
      onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
        focused.current = false;
        setText(String(value));
        onBlur?.(event);
      }}
    />
  );
}
