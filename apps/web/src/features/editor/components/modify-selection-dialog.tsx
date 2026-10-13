"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { MAX_MODIFY, type ModifyShape } from "../pixel-canvas/selection";
import { SIZE_LABEL, SizeField } from "./size-controls";

export type ModifyKind = "expand" | "contract" | "border" | "stroke";

const TEXT: Record<
  ModifyKind,
  { title: string; lead: string; action: string }
> = {
  expand: {
    title: "Expand Selection",
    lead: "Grow the selection outward. Expand by 1, then fill it on a layer underneath, and what was selected gets an outline.",
    action: "Expand",
  },
  contract: {
    title: "Contract Selection",
    lead: "Shrink the selection inward, away from its edge and the tile’s.",
    action: "Contract",
  },
  border: {
    title: "Border",
    lead: "Keep only a band just inside the selection’s edge.",
    action: "Select border",
  },
  stroke: {
    title: "Stroke Selection",
    lead: "Draw a line of the primary colour along the inside of the selection’s edge.",
    action: "Stroke",
  },
};

const SHAPES: { value: ModifyShape; label: string; hint: string }[] = [
  {
    value: "round",
    label: "Round",
    hint: "Measures straight across: thin, clean pixel-art lines.",
  },
  {
    value: "square",
    label: "Square",
    hint: "Counts diagonals too: fuller lines and corners.",
  },
];

type ModifyProps = {
  kind: ModifyKind;
  onApply: (by: number, shape: ModifyShape) => void;
};

export default function ModifySelectionDialog({
  onClose,
  ...props
}: ModifyProps & { onClose: () => void }) {
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <ModifyForm {...props} />
    </Dialog>
  );
}

function ModifyForm({ kind, onApply }: ModifyProps) {
  const { close } = useDialog();
  const [by, setBy] = useState("1");
  const [shape, setShape] = useState<ModifyShape>("round");
  const text = TEXT[kind];
  const amount = Number(by);
  const valid = Number.isInteger(amount) && amount >= 1 && amount <= MAX_MODIFY;

  return (
    <form
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onApply(amount, shape);
        close();
      }}
    >
      <ModalHeader title={text.title} />
      <DialogBody className="grid gap-5 py-5">
        <p className="-mb-1 text-sm text-muted-foreground">{text.lead}</p>
        <SizeField
          id="modify-by"
          label={kind === "stroke" ? "Width" : "By"}
          unit="px"
          value={by}
          onChange={setBy}
        />
        <fieldset>
          <legend className={SIZE_LABEL}>Shape</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {SHAPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={shape === value}
                onClick={() => setShape(value)}
                className={cn(
                  "h-11 rounded-xl border px-3 text-sm transition-colors",
                  shape === value
                    ? "border-primary-soft bg-pastel-pink-soft font-semibold"
                    : "bg-background hover:bg-pink-base",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {SHAPES.find((s) => s.value === shape)?.hint}
          </p>
        </fieldset>
        {!valid && (
          <FormMessage tone="error">
            Use a whole number from 1 to {MAX_MODIFY} pixels.
          </FormMessage>
        )}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={!valid}>
          {text.action}
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
