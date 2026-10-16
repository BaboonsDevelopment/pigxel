"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { CANVAS_SIZES } from "@/features/explore/constants";
import { useDismiss } from "@/features/explore/components/explore-header/components/menu-button";
import {
  NO_PROJECT_FILTERS,
  PUBLISHED,
  STORAGES,
  type ProjectFilters,
} from "../constants";
import type { Label } from "../../../labels";
import { FilterIcon } from "./toolbar-icons";
import { Chevron, TOOLBAR_PANEL, TOOLBAR_TRIGGER } from "./toolbar-menu";

const ANY_LABEL = "any";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[13px] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Select<Value extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  return (
    <Field label={label}>
      <span className="relative block">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value as Value)}
          className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-[#ecd3dd] bg-background pr-9 pl-2.5 text-[13px] text-[#4a1f35] outline-none focus-visible:border-[#8c3a57]"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#4a1f35]">
          <Chevron open={false} />
        </span>
      </span>
    </Field>
  );
}

export function ProjectFiltersMenu({
  filters,
  onChange,
  labels,
  storage = true,
}: {
  filters: ProjectFilters;
  onChange: (filters: ProjectFilters) => void;
  labels: Label[];
  storage?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const root = useDismiss(open, () => setOpen(false));
  const panelId = useId();
  const animatedId = useId();
  const active =
    Number(filters.size !== "any") +
    Number(filters.storage !== "any") +
    Number(filters.label !== null) +
    Number(filters.published !== "any") +
    Number(filters.animated);
  const patch = (next: Partial<ProjectFilters>) =>
    setDraft((d) => ({ ...d, ...next }));

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`Filters${active ? `, ${active} on` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          setDraft(filters);
          setOpen(!open);
        }}
        className={TOOLBAR_TRIGGER}
      >
        <FilterIcon />
        Filters
        {active > 0 && (
          <span
            aria-hidden="true"
            className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground tabular-nums"
          >
            {active}
          </span>
        )}
        <Chevron open={open} />
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Filters"
          className={cn(TOOLBAR_PANEL, "w-[19rem] p-4")}
        >
          <div className="grid gap-4">
            <Field label="Size">
              <div
                role="radiogroup"
                aria-label="Size"
                className="grid grid-cols-3 gap-1.5"
              >
                {CANVAS_SIZES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={draft.size === s.value}
                    onClick={() => patch({ size: s.value })}
                    className="h-8 cursor-pointer rounded-lg border border-[#ecd3dd] bg-background text-xs text-[#4a1f35] tabular-nums transition-colors hover:bg-muted aria-checked:border-transparent aria-checked:bg-[#fde2ea]"
                  >
                    {s.value === "any" ? "Any size" : s.label}
                  </button>
                ))}
              </div>
            </Field>
            {storage && (
              <Select
                label="Storage"
                options={STORAGES}
                value={draft.storage}
                onChange={(value) => patch({ storage: value })}
              />
            )}
            <Select
              label="Explore"
              options={PUBLISHED}
              value={draft.published}
              onChange={(value) => patch({ published: value })}
            />
            {labels.length > 0 && (
              <Select
                label="Label"
                options={[
                  { value: ANY_LABEL, label: "Any label" },
                  ...labels.map((l) => ({ value: l.id, label: l.name })),
                ]}
                value={draft.label ?? ANY_LABEL}
                onChange={(value) =>
                  patch({ label: value === ANY_LABEL ? null : value })
                }
              />
            )}
            <label
              htmlFor={animatedId}
              className="flex cursor-pointer items-center justify-between gap-3 text-[13px] text-[#4a1f35]"
            >
              Animated only
              <span className="relative inline-flex">
                <input
                  id={animatedId}
                  type="checkbox"
                  role="switch"
                  checked={draft.animated}
                  onChange={(e) => patch({ animated: e.target.checked })}
                  className="peer h-5 w-9 cursor-pointer appearance-none rounded-full bg-[#9a8790] transition-colors outline-none checked:bg-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <span className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-4" />
              </span>
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <button
              type="button"
              onClick={() => setDraft(NO_PROJECT_FILTERS)}
              className="h-9 cursor-pointer rounded-lg border border-primary/40 bg-background px-3 text-[13px] text-primary transition-colors hover:bg-muted"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onChange(draft);
              }}
              className="h-9 cursor-pointer rounded-lg bg-primary px-5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
