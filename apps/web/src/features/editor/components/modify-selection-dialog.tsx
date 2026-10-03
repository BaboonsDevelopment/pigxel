"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Radio } from "@pigxel/ui/components/choice";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { MAX_MODIFY, type ModifyShape } from "../pixel-canvas/selection";
import { NumberField } from "./number-field";

export type ModifyKind = "expand" | "contract" | "border" | "stroke";

const TEXT: Record<
  ModifyKind,
  { title: string; lead: string; action: string }
> = {
  expand: {
    title: "Expand selection",
    lead: "Grow the selection outward. Expand by 1, then fill it on a layer underneath, and what was selected gets an outline.",
    action: "Expand",
  },
  contract: {
    title: "Contract selection",
    lead: "Shrink the selection inward, away from its edge and the tile’s.",
    action: "Contract",
  },
  border: {
    title: "Border",
    lead: "Keep only a band just inside the selection’s edge.",
    action: "Select border",
  },
  stroke: {
    title: "Stroke selection",
    lead: "Draw a line of the primary colour along the inside of the selection’s edge.",
    action: "Stroke",
  },
};

export default function ModifySelectionDialog({
  kind,
  onApply,
  onClose,
}: {
  kind: ModifyKind;
  onApply: (by: number, shape: ModifyShape) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [by, setBy] = useState(1);
  const [shape, setShape] = useState<ModifyShape>("round");
  useEffect(() => dialog.current?.showModal(), []);
  const text = TEXT[kind];
  const valid = by >= 1 && by <= MAX_MODIFY;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="modify-selection-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <form
        className="space-y-5 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onApply(by, shape);
          dialog.current?.close();
        }}
      >
        <div>
          <SectionTitle id="modify-selection-title">{text.title}</SectionTitle>
          <Lead className="mt-1">{text.lead}</Lead>
        </div>
        <div className="w-32">
          <NumberField
            id="modify-by"
            label={`${kind === "stroke" ? "Width" : "By"}, px (1–${MAX_MODIFY})`}
            value={by}
            onChange={(n) => setBy(n)}
          />
        </div>
        <fieldset className="space-y-2 text-sm">
          <legend className="mb-1 font-medium">Shape</legend>
          <label className="flex items-start gap-2">
            <Radio
              name="modify-shape"
              checked={shape === "round"}
              onChange={() => setShape("round")}
            />
            <span>
              Round
              <span className="block text-muted-foreground">
                Measures straight across: thin, clean pixel-art lines.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <Radio
              name="modify-shape"
              checked={shape === "square"}
              onChange={() => setShape("square")}
            />
            <span>
              Square
              <span className="block text-muted-foreground">
                Counts diagonals too: fuller lines and corners.
              </span>
            </span>
          </label>
        </fieldset>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            {text.action}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
