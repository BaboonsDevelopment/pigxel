"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Checkbox, Radio } from "@pigxel/ui/components/choice";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import {
  DEFAULT_ONION,
  ONION_SIDES,
  type OnionSettings,
} from "../pixel-canvas/view";

export default function OnionSettingsDialog({
  settings,
  onChange,
  onClose,
}: {
  settings: OnionSettings;
  onChange: (settings: OnionSettings) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => dialog.current?.showModal(), []);
  const startMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      e.button !== 0 ||
      (e.target as Element).closest("input, button, label, select")
    )
      return;
    const el = e.currentTarget;
    const from = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    el.setPointerCapture(e.pointerId);
    const box = dialog.current!.getBoundingClientRect();
    const left = box.left - offset.x;
    const top = box.top - offset.y;
    const clamp = (v: number, min: number, max: number) =>
      Math.min(Math.max(v, min), Math.max(min, max));
    const move = (event: PointerEvent) =>
      setOffset({
        x: clamp(
          event.clientX - from.x,
          -left,
          window.innerWidth - box.width - left,
        ),
        y: clamp(
          event.clientY - from.y,
          -top,
          window.innerHeight - box.height - top,
        ),
      });
    const end = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  };
  const set = (patch: Partial<OnionSettings>) =>
    onChange({ ...settings, ...patch });

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="onion-settings-title"
      style={{ translate: offset.x + "px " + offset.y + "px" }}
      className="m-auto mr-4 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-transparent"
    >
      <div
        onPointerDown={startMove}
        className="cursor-move touch-none space-y-5 p-5 select-none [&_button]:cursor-pointer [&_label]:cursor-default"
      >
        <div title="Drag to move">
          <SectionTitle id="onion-settings-title">Onion skin</SectionTitle>
          <Lead className="mt-1">Changes show on the canvas right away.</Lead>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <span className="w-16 font-medium">Opacity</span>
          <input
            type="range"
            min={5}
            max={100}
            value={settings.opacity}
            onChange={(e) => set({ opacity: Number(e.target.value) })}
            className="min-w-0 flex-1 accent-primary"
          />
          <span className="w-10 text-right tabular-nums">
            {settings.opacity}%
          </span>
        </label>

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={settings.tint}
              onChange={(e) => set({ tint: e.target.checked })}
            />
            Tint the frames
          </label>
          <div className="flex gap-4 pl-6">
            <label className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Colour of frames behind"
                value={settings.before}
                disabled={!settings.tint}
                onChange={(e) => set({ before: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border bg-background disabled:opacity-40"
              />
              Behind
            </label>
            <label className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Colour of frames ahead"
                value={settings.after}
                disabled={!settings.tint}
                onChange={(e) => set({ after: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border bg-background disabled:opacity-40"
              />
              Ahead
            </label>
          </div>
        </div>

        <fieldset className="space-y-2 text-sm">
          <legend className="mb-1 font-medium">Show</legend>
          {ONION_SIDES.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2">
              <Radio
                name="onion-side"
                className="mt-0"
                checked={settings.side === value}
                onChange={() => set({ side: value })}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={settings.inTag}
            onChange={(e) => set({ inTag: e.target.checked })}
          />
          Only frames in the current frame’s tag
        </label>

        <div className="flex justify-between gap-2 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(DEFAULT_ONION)}
          >
            Reset
          </Button>
          <Button type="button" onClick={() => dialog.current?.close()}>
            Done
          </Button>
        </div>
      </div>
    </dialog>
  );
}
