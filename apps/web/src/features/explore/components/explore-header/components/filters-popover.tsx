"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import {
  ANIMATIONS,
  CANVAS_SIZES,
  FEEDS,
  NO_FILTERS,
  type Animation,
  type CanvasSize,
  type Feed,
} from "../../../constants";
import { ChevronIcon, FiltersIcon } from "./icons";
import { TRIGGER, useDismiss } from "./menu-button";

export type FilterValues = {
  size: CanvasSize;
  animation: Animation;
  feed: Feed;
  mine: boolean;
};

const DEFAULTS: FilterValues = {
  size: NO_FILTERS.size,
  animation: NO_FILTERS.animation,
  feed: NO_FILTERS.feed,
  mine: NO_FILTERS.mine,
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b pb-4 last-of-type:border-b-0">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function Radio({
  name,
  checked,
  disabled,
  label,
  onChange,
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 py-1 text-sm",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="size-4 cursor-pointer accent-primary"
      />
      {label}
    </label>
  );
}

export function FiltersPopover({
  value,
  guest,
  onApply,
}: {
  value: FilterValues;
  guest: boolean;
  onApply: (value: FilterValues) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const root = useDismiss(open, () => setOpen(false));
  const active =
    Number(value.size !== DEFAULTS.size) +
    Number(value.animation !== DEFAULTS.animation) +
    Number(value.feed !== DEFAULTS.feed) +
    Number(value.mine);
  const patch = (next: Partial<FilterValues>) =>
    setDraft((d) => ({ ...d, ...next }));

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setDraft(value);
          setOpen(!open);
        }}
        className={TRIGGER}
      >
        <FiltersIcon />
        Filters
        {active > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground tabular-nums">
            {active}
          </span>
        )}
        <ChevronIcon />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Filters"
          className="absolute top-full left-0 z-30 mt-2 w-80 rounded-2xl border bg-popover p-4 shadow-lg animate-in fade-in slide-in-from-top-1"
        >
          <div className="flex flex-col gap-4">
            <Section title="Canvas size">
              <div className="grid grid-cols-3 gap-2">
                {CANVAS_SIZES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={draft.size === s.value}
                    onClick={() => patch({ size: s.value })}
                    className="h-9 cursor-pointer rounded-lg border bg-background text-xs transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-pastel-pink-soft"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Animation">
              {ANIMATIONS.map((a) => (
                <Radio
                  key={a.value}
                  name="animation"
                  label={a.label}
                  checked={draft.animation === a.value}
                  onChange={() => patch({ animation: a.value })}
                />
              ))}
            </Section>
            <Section title="Published by">
              {FEEDS.map((f) => (
                <Radio
                  key={f.value}
                  name="feed"
                  label={f.label}
                  checked={draft.feed === f.value}
                  disabled={guest && f.value === "following"}
                  onChange={() => patch({ feed: f.value })}
                />
              ))}
              <label
                className={cn(
                  "mt-1 flex cursor-pointer items-center gap-2.5 py-1 text-sm",
                  guest && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={draft.mine}
                  disabled={guest}
                  onChange={(e) => patch({ mine: e.target.checked })}
                  className="size-4 cursor-pointer accent-primary"
                />
                Only arts I liked
              </label>
            </Section>
          </div>
          <div className="mt-4 flex gap-3 border-t pt-4">
            <button
              type="button"
              onClick={() => setDraft(DEFAULTS)}
              className="h-10 flex-1 cursor-pointer rounded-lg border border-primary/40 bg-background text-sm text-primary transition-colors hover:bg-muted"
            >
              Reset filters
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onApply(draft);
              }}
              className="h-10 flex-1 cursor-pointer rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Apply filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
