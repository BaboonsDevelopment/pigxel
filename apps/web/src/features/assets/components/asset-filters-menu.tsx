"use client";

import { useId, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { CANVAS_SIZES } from "@/features/explore/constants";
import { useDismiss } from "@/features/explore/components/explore-header/components/menu-button";
import {
  FilterField,
  FilterSelect,
  FilterSwitch,
} from "@/features/tiles/components/projects-view/components/project-filters-menu";
import { FilterIcon } from "@/features/tiles/components/projects-view/components/toolbar-icons";
import {
  Chevron,
  TOOLBAR_PANEL,
  TOOLBAR_TRIGGER,
} from "@/features/tiles/components/projects-view/components/toolbar-menu";
import {
  ACCESS,
  activeFilters,
  KINDS,
  MOTIONS,
  NO_ASSET_FILTERS,
  type AssetFilters,
} from "../filters";

const CHOICE =
  "h-8 cursor-pointer rounded-lg border border-[#ecd3dd] bg-background px-2.5 text-xs text-[#4a1f35] tabular-nums transition-colors hover:bg-muted aria-checked:border-transparent aria-checked:bg-[#fde2ea] aria-pressed:border-transparent aria-pressed:bg-[#fde2ea]";

const ANY_PACK = "any";

type FieldOptions = {
  tags: { id: string; name: string }[];
  packs: { id: string; name: string }[];
  /** Offer the sprite/tile filter (not for packs). */
  kind?: boolean;
  /** Offer the pack filter (not on the Packs tab or a pack's page). */
  pack?: boolean;
};

/** Every asset filter; the dropdown and the sidebar both show these. */
function AssetFilterFields({
  value,
  onPatch,
  tags,
  packs,
  kind = true,
  pack = true,
}: FieldOptions & {
  value: AssetFilters;
  onPatch: (next: Partial<AssetFilters>) => void;
}) {
  return (
    <div className="grid gap-4">
      {tags.length > 0 && (
        <FilterField label="Tags">
          <div
            role="group"
            aria-label="Tags"
            className="flex flex-wrap gap-1.5"
          >
            {tags.map((tag) => {
              const on = value.tags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    onPatch({
                      tags: on
                        ? value.tags.filter((t) => t !== tag.id)
                        : [...value.tags, tag.id],
                    })
                  }
                  className={CHOICE}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </FilterField>
      )}
      <FilterField label="Size">
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
              aria-checked={value.size === s.value}
              onClick={() => onPatch({ size: s.value })}
              className={CHOICE}
            >
              {s.value === "any" ? "Any size" : s.label}
            </button>
          ))}
        </div>
      </FilterField>
      <FilterSelect
        label="Motion"
        options={MOTIONS}
        value={value.motion}
        onChange={(motion) => onPatch({ motion })}
      />
      {kind && (
        <FilterSelect
          label="Kind"
          options={KINDS}
          value={value.kind}
          onChange={(kind) => onPatch({ kind })}
        />
      )}
      <FilterSelect
        label="Access"
        options={ACCESS}
        value={value.access}
        onChange={(access) => onPatch({ access })}
      />
      {pack && (
        <FilterSelect
          label="Pack"
          options={[
            { value: ANY_PACK, label: "Any pack" },
            ...packs.map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={value.pack ?? ANY_PACK}
          onChange={(pack) =>
            onPatch({ pack: pack === ANY_PACK ? null : pack })
          }
        />
      )}
      <FilterSwitch
        label="Favourites only"
        on={value.favourites}
        onChange={(favourites) => onPatch({ favourites })}
      />
    </div>
  );
}

/** No filters, keeping the search and sort. */
const cleared = (filters: AssetFilters): AssetFilters => ({
  ...NO_ASSET_FILTERS,
  query: filters.query,
  sort: filters.sort,
});

function TriggerContent({ active }: { active: number }) {
  return (
    <>
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
    </>
  );
}

/** Opens and closes the filters sidebar. */
export function AssetFiltersToggle({
  filters,
  open,
  onToggle,
  controls,
}: {
  filters: AssetFilters;
  open: boolean;
  onToggle: () => void;
  /** The sidebar's id. */
  controls: string;
}) {
  const active = activeFilters(filters);
  return (
    <button
      type="button"
      aria-label={`Filters${active ? `, ${active} on` : ""}`}
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className={TOOLBAR_TRIGGER}
    >
      <TriggerContent active={active} />
    </button>
  );
}

/** Filters docked beside the results; each change applies at once. */
export function AssetFiltersSidebar({
  id,
  filters,
  onChange,
  onClose,
  ...options
}: FieldOptions & {
  id: string;
  filters: AssetFilters;
  onChange: (filters: AssetFilters) => void;
  onClose: () => void;
}) {
  return (
    <aside
      id={id}
      aria-label="Filters"
      className="rounded-2xl border border-[#ecd3dd] bg-background p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[#4a1f35]">Filters</h2>
        <button
          type="button"
          aria-label="Close filters"
          onClick={onClose}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="size-4"
          >
            <path d="m4 4 8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      <AssetFilterFields
        value={filters}
        onPatch={(next) => onChange({ ...filters, ...next })}
        {...options}
      />
      <button
        type="button"
        disabled={activeFilters(filters) === 0}
        onClick={() => onChange(cleared(filters))}
        className="mt-5 h-9 w-full cursor-pointer rounded-lg border border-primary/40 bg-background px-3 text-[13px] text-primary transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-50"
      >
        Clear all
      </button>
    </aside>
  );
}

/** Filters in a dropdown, applied together: for narrow places. */
export function AssetFiltersMenu({
  filters,
  onChange,
  ...options
}: FieldOptions & {
  filters: AssetFilters;
  onChange: (filters: AssetFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const root = useDismiss(open, () => setOpen(false));
  const panelId = useId();
  const active = activeFilters(filters);

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
        <TriggerContent active={active} />
        <Chevron open={open} />
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Filters"
          className={cn(
            TOOLBAR_PANEL,
            "max-h-[min(36rem,calc(100dvh-12rem))] w-[20rem] overflow-y-auto p-4",
          )}
        >
          <AssetFilterFields
            value={draft}
            onPatch={(next) => setDraft((d) => ({ ...d, ...next }))}
            {...options}
          />
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <button
              type="button"
              onClick={() => setDraft(cleared(draft))}
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
