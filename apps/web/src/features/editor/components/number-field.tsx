"use client";

import { useState } from "react";
import { Label } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";

export function NumberField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    if (Number(text) !== value) setText(String(value));
  }
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="block text-xs">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="numeric"
        inputSize="sm"
        value={text}
        disabled={disabled}
        title={disabled ? "The drawing is kept on this side" : undefined}
        onChange={(e) => {
          const typed = e.target.value.replace(/[^\d-]/g, "");
          setText(typed);
          const n = Number(typed);
          if (typed !== "" && typed !== "-" && Number.isInteger(n)) onChange(n);
        }}
        onBlur={() => setText(String(value))}
        className="tabular-nums"
      />
    </div>
  );
}
