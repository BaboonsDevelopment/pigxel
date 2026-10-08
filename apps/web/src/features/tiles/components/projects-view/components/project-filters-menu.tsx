"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { SIZES } from "@/features/explore/constants";
import {
  NO_PROJECT_FILTERS,
  STORAGES,
  type ProjectFilters,
} from "../constants";
import type { Label } from "../../../labels";

const ITEM =
  "flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left whitespace-nowrap text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

type Submenu = "size" | "storage" | "label";

const ANY_LABEL = "any";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
    >
      {children}
    </svg>
  );
}

export function ProjectFiltersMenu({
  filters,
  onChange,
  labels,
}: {
  filters: ProjectFilters;
  onChange: (filters: ProjectFilters) => void;
  labels: Label[];
}) {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<Submenu | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const active =
    Number(filters.size !== "any") +
    Number(filters.storage !== "any") +
    Number(filters.label !== null) +
    Number(filters.animated);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const choose = (patch: Partial<ProjectFilters>) => {
    setOpen(false);
    onChange({ ...filters, ...patch });
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`Filters${active ? `, ${active} on` : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setSubmenu(null);
          setOpen(!open);
        }}
        className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3.5 text-xs transition-colors hover:bg-muted"
      >
        Filters
        {active > 0 && (
          <span
            aria-hidden="true"
            className="flex size-4 items-center justify-center rounded-full bg-pastel-pink text-[10px] font-semibold tabular-nums animate-in zoom-in-50"
          >
            {active}
          </span>
        )}
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5">
          <path
            d="m4 6 4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          className="absolute top-full left-0 z-20 mt-1 min-w-52 rounded-lg border bg-popover p-1 text-xs shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <SubmenuItem
            label="Size"
            icon={
              <>
                <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
                <path d="M2.5 8h11M8 2.5v11" />
              </>
            }
            options={SIZES}
            value={filters.size}
            open={submenu === "size"}
            onOpenChange={(next) => setSubmenu(next ? "size" : null)}
            onChange={(size) => choose({ size })}
          />
          <SubmenuItem
            label="Storage"
            icon={
              <>
                <ellipse cx="8" cy="4" rx="5" ry="1.8" />
                <path d="M3 4v8c0 1 2.2 1.8 5 1.8s5-.8 5-1.8V4M3 8c0 1 2.2 1.8 5 1.8S13 9 13 8" />
              </>
            }
            options={STORAGES}
            value={filters.storage}
            open={submenu === "storage"}
            onOpenChange={(next) => setSubmenu(next ? "storage" : null)}
            onChange={(storage) => choose({ storage })}
          />
          {labels.length > 0 && (
            <SubmenuItem
              label="Label"
              icon={
                <path d="M2.5 3.5v4.2l6 6 5.2-5.2-6-6H3.5a1 1 0 0 0-1 1ZM5.5 5.5h.01" />
              }
              options={[
                { value: ANY_LABEL, label: "Any label" },
                ...labels.map((label) => ({
                  value: label.id,
                  label: label.name,
                  color: label.color,
                })),
              ]}
              value={filters.label ?? ANY_LABEL}
              open={submenu === "label"}
              onOpenChange={(next) => setSubmenu(next ? "label" : null)}
              onChange={(label) =>
                choose({ label: label === ANY_LABEL ? null : label })
              }
            />
          )}
          <li role="none">
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={filters.animated}
              onPointerEnter={() => setSubmenu(null)}
              onClick={() => choose({ animated: !filters.animated })}
              className={cn(ITEM, filters.animated && "text-foreground")}
            >
              <Icon>
                <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
                <path d="M6.75 6v4l3.5-2z" fill="currentColor" />
              </Icon>
              Animated only
              <span
                aria-hidden="true"
                className={cn(
                  "ml-auto flex size-3.5 items-center justify-center rounded-sm border transition-colors",
                  filters.animated &&
                    "border-transparent bg-primary text-primary-foreground",
                )}
              >
                {filters.animated && (
                  <svg viewBox="0 0 16 16" className="size-3">
                    <path
                      d="m3.5 8.5 3 3 6-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </button>
          </li>
          {active > 0 && (
            <>
              <li role="separator" className="my-1 border-t" />
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  onPointerEnter={() => setSubmenu(null)}
                  onClick={() => choose(NO_PROJECT_FILTERS)}
                  className={cn(ITEM, "text-primary hover:text-primary")}
                >
                  Clear filters
                </button>
              </li>
            </>
          )}
        </ul>
      )}
    </div>
  );
}

function SubmenuItem<Value extends string>({
  label,
  icon,
  options,
  value,
  open,
  onOpenChange,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  options: readonly { value: Value; label: string; color?: string }[];
  value: Value;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: Value) => void;
}) {
  const id = useId();
  const current = options.find((o) => o.value === value) ?? options[0];
  const changed = value !== options[0]?.value;
  return (
    <li
      role="none"
      className="relative"
      onPointerEnter={() => onOpenChange(true)}
      onPointerLeave={() => onOpenChange(false)}
    >
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => onOpenChange(!open)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") onOpenChange(true);
          if (e.key === "ArrowLeft") onOpenChange(false);
        }}
        className={cn(
          ITEM,
          (open || changed) && "text-foreground",
          open && "bg-secondary",
        )}
      >
        <Icon>{icon}</Icon>
        {label}
        <span className="ml-auto max-w-28 truncate pl-4 text-muted-foreground">
          {current?.label}
        </span>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3">
          <path
            d="m6 4 4 4-4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute top-0 left-full z-30 -mt-1 pl-1.5">
          <ul
            id={id}
            role="menu"
            aria-label={label}
            className="min-w-32 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in slide-in-from-left-1 duration-150"
          >
            {options.map((option) => (
              <li key={option.value} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={option.value === value}
                  onClick={() => onChange(option.value)}
                  className={cn(
                    ITEM,
                    "tabular-nums",
                    option.value === value &&
                      "bg-pastel-pink-soft text-foreground",
                  )}
                >
                  {option.color && (
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: option.color }}
                    />
                  )}
                  <span className="truncate">{option.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
