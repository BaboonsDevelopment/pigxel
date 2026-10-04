"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { BLEND_MODES, MAX_OPACITY } from "@/lib/layers/constants";
import type { Layer } from "@/lib/layers/types";
import type { LayerPatch } from "../../pixel-canvas/use-sprite";

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
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <DialogHeader title="Layer properties" />
      <DialogBody>
        <form
          id="layer-properties"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) return;
            onChange({ name: trimmed, opacity, blend, labelColor });
            (e.currentTarget.closest("dialog") as HTMLDialogElement).close();
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block">Name</span>
            <input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2"
            />
          </label>
          {layer.kind !== "background" && (
            <>
              <label className="block text-sm">
                <span className="mb-1 block">
                  Opacity: {Math.round((opacity / MAX_OPACITY) * 100)}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={MAX_OPACITY}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block">Blend mode</span>
                <select
                  value={blend}
                  onChange={(e) => setBlend(e.target.value as Layer["blend"])}
                  className="h-9 w-full rounded-md border bg-background px-2"
                >
                  {BLEND_MODES.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <fieldset>
            <legend className="mb-2 text-sm">Timeline label</legend>
            <div className="flex gap-2">
              <button
                type="button"
                title="No color"
                aria-label="No color"
                aria-pressed={!labelColor}
                onClick={() => setLabelColor(undefined)}
                className="size-7 rounded-full border text-sm aria-pressed:ring-2 aria-pressed:ring-primary"
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
                  className="size-7 rounded-full border aria-pressed:ring-2 aria-pressed:ring-primary aria-pressed:ring-offset-2"
                />
              ))}
            </div>
          </fieldset>
        </form>
      </DialogBody>
      <DialogFooter>
        <SaveButton />
      </DialogFooter>
    </Dialog>
  );
}

function SaveButton() {
  const { close } = useDialog();
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={close}
        className="rounded-md border px-3 py-1.5 text-sm"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="layer-properties"
        className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
      >
        Save
      </button>
    </div>
  );
}
