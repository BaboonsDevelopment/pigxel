"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { Checkbox } from "@pigxel/ui/components/choice";
import { Input } from "@pigxel/ui/components/input";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { SIZE_LABEL } from "../../components/size-controls";
import { BLEND_MODES, MAX_OPACITY } from "@/lib/layers/constants";
import type { Layer } from "@/lib/layers/types";
import type { LayerPatch } from "../../pixel-canvas/use-sprite";
import { EditorSelect } from "../../components/editor-select";

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
];

export function LayerPropertiesDialog({
  layer,
  onChange,
  onClose,
}: {
  layer: Layer;
  onChange: (patch: LayerPatch) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(layer.name);
  const [opacity, setOpacity] = useState(layer.opacity);
  const [blend, setBlend] = useState(layer.blend);
  const [labelColor, setLabelColor] = useState(layer.labelColor);
  const [above, setAbove] = useState(!!layer.above);
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <ModalHeader title="Layer Properties" />
      <DialogBody className="py-5">
        <form
          id="layer-properties"
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) return;
            onChange({
              name: trimmed,
              opacity,
              blend,
              labelColor,
              ...(layer.kind === "reference" && { above }),
            });
            (e.currentTarget.closest("dialog") as HTMLDialogElement).close();
          }}
        >
          <label className="block">
            <span className={SIZE_LABEL}>Name</span>
            <Input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl px-4 text-base"
            />
          </label>
          {layer.kind !== "background" && (
            <>
              <label className="flex items-center gap-3 text-sm">
                <span className="w-16 font-semibold">Opacity</span>
                <input
                  type="range"
                  min={0}
                  max={MAX_OPACITY}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="min-w-0 flex-1 accent-pink-strong"
                />
                <span className="w-10 text-right tabular-nums">
                  {Math.round((opacity / MAX_OPACITY) * 100)}%
                </span>
              </label>
              <div>
                <span className={SIZE_LABEL}>Blend mode</span>
                <EditorSelect
                  value={blend}
                  onChange={(value) => setBlend(value as Layer["blend"])}
                  ariaLabel="Blend mode"
                  className="h-12 w-full rounded-xl px-4 text-base"
                  options={BLEND_MODES.map((mode) => ({
                    value: mode.id,
                    label: mode.label,
                  }))}
                />
              </div>
            </>
          )}
          {layer.kind === "reference" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={above}
                onChange={(e) => setAbove(e.target.checked)}
              />
              Show above the art
            </label>
          )}
          <fieldset>
            <legend className={SIZE_LABEL}>Timeline label</legend>
            <div className="flex gap-2">
              <button
                type="button"
                title="No color"
                aria-label="No color"
                aria-pressed={!labelColor}
                onClick={() => setLabelColor(undefined)}
                className="size-8 rounded-full border text-sm text-muted-foreground aria-pressed:ring-2 aria-pressed:ring-pink-strong aria-pressed:ring-offset-2"
              >
                ×
              </button>
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  aria-label={`Label ${color}`}
                  aria-pressed={labelColor === color}
                  onClick={() => setLabelColor(color)}
                  style={{ backgroundColor: color }}
                  className="size-8 rounded-full ring-1 ring-black/10 aria-pressed:ring-2 aria-pressed:ring-pink-strong aria-pressed:ring-offset-2"
                />
              ))}
            </div>
          </fieldset>
        </form>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <SaveButton />
      </DialogFooter>
    </Dialog>
  );
}

function SaveButton() {
  const { close } = useDialog();
  return (
    <>
      <ModalButton variant="secondary" onClick={close}>
        Cancel
      </ModalButton>
      <ModalButton type="submit" form="layer-properties">
        Save
      </ModalButton>
    </>
  );
}
