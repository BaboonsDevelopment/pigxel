"use client";

import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@pigxel/ui/components/choice";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { ModalHeader } from "@/components/ui/modal-header";
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

  const close = () => dialog.current?.close();
  const option = (on: boolean) =>
    cn(
      "h-10 rounded-xl border px-3 text-sm transition-colors",
      on
        ? "border-primary-soft bg-pastel-pink-soft font-semibold"
        : "bg-background hover:bg-pink-base",
    );

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="onion-settings-title"
      style={{ translate: offset.x + "px " + offset.y + "px" }}
      className="m-auto mr-4 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-transparent"
    >
      <div
        title="Drag to move"
        onPointerDown={startMove}
        className="cursor-move touch-none select-none"
      >
        <ModalHeader
          title="Onion Skin"
          titleId="onion-settings-title"
          onClose={close}
        />
      </div>

      <div className="grid gap-5 p-5">
        <label className="flex items-center gap-3 text-sm">
          <span className="w-16 font-semibold">Opacity</span>
          <input
            type="range"
            min={5}
            max={100}
            value={settings.opacity}
            onChange={(e) => set({ opacity: Number(e.target.value) })}
            className="min-w-0 flex-1 accent-pink-strong"
          />
          <span className="w-10 text-right tabular-nums">
            {settings.opacity}%
          </span>
        </label>

        <div className="grid gap-3 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={settings.tint}
              onChange={(e) => set({ tint: e.target.checked })}
            />
            Tint the frames
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["before", "Behind"],
                ["after", "Ahead"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-xl border px-3",
                  settings.tint
                    ? "cursor-pointer hover:bg-pink-base"
                    : "opacity-50",
                )}
              >
                <span className="relative size-5 shrink-0 overflow-hidden rounded-md ring-1 ring-black/10">
                  <span
                    className="absolute inset-0"
                    style={{ backgroundColor: settings[key] }}
                  />
                  <input
                    type="color"
                    aria-label={`Colour of frames ${label.toLowerCase()}`}
                    value={settings[key]}
                    disabled={!settings.tint}
                    onChange={(e) => set({ [key]: e.target.value })}
                    className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-default"
                  />
                </span>
                {label}
              </label>
            ))}
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 block text-sm font-semibold">Show</legend>
          <div role="radiogroup" className="grid grid-cols-3 gap-2">
            {ONION_SIDES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={settings.side === value}
                onClick={() => set({ side: value })}
                className={option(settings.side === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={settings.inTag}
            onChange={(e) => set({ inTag: e.target.checked })}
          />
          Only frames in the current frame’s tag
        </label>
      </div>

      <div className="flex items-center gap-2 border-t bg-pink-base px-5 py-4">
        <button
          type="button"
          onClick={() => onChange(DEFAULT_ONION)}
          className="mr-auto text-xs text-link-accent transition-colors hover:text-lavender-foreground"
        >
          Reset
        </button>
        <ModalButton onClick={close}>Done</ModalButton>
      </div>
    </dialog>
  );
}
