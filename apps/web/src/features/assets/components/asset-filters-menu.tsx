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

export function AssetFiltersMenu({
  filters,
  onChange,
  tags,
  packs,
  kind = true,
  pack = true,
}: {
  filters: AssetFilters;
  onChange: (filters: AssetFilters) => void;
  tags: { id: string; name: string }[];
  packs: { id: string; name: string }[];
  /** Offer the sprite/tile filter (not for packs). */
  kind?: boolean;
  /** Offer the pack filter (not on the Packs tab or a pack's page). */
  pack?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const root = useDismiss(open, () => setOpen(false));
  const panelId = useId();
  const active = activeFilters(filters);
  const patch = (next: Partial<AssetFilters>) =>
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
          className={cn(
            TOOLBAR_PANEL,
            "max-h-[min(36rem,calc(100dvh-12rem))] w-[20rem] overflow-y-auto p-4",
          )}
        >
          <div className="grid gap-4">
            {tags.length > 0 && (
              <FilterField label="Tags">
                <div
                  role="group"
                  aria-label="Tags"
                  className="flex flex-wrap gap-1.5"
                >
                  {tags.map((tag) => {
                    const on = draft.tags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          patch({
                            tags: on
                              ? draft.tags.filter((t) => t !== tag.id)
                              : [...draft.tags, tag.id],
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
                    aria-checked={draft.size === s.value}
                    onClick={() => patch({ size: s.value })}
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
              value={draft.motion}
              onChange={(motion) => patch({ motion })}
            />
            {kind && (
              <FilterSelect
                label="Kind"
                options={KINDS}
                value={draft.kind}
                onChange={(kind) => patch({ kind })}
              />
            )}
            <FilterSelect
              label="Access"
              options={ACCESS}
              value={draft.access}
              onChange={(access) => patch({ access })}
            />
            {pack && (
              <FilterSelect
                label="Pack"
                options={[
                  { value: ANY_PACK, label: "Any pack" },
                  ...packs.map((p) => ({ value: p.id, label: p.name })),
                ]}
                value={draft.pack ?? ANY_PACK}
                onChange={(pack) =>
                  patch({ pack: pack === ANY_PACK ? null : pack })
                }
              />
            )}
            <FilterSwitch
              label="Favourites only"
              on={draft.favourites}
              onChange={(favourites) => patch({ favourites })}
            />
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...NO_ASSET_FILTERS,
                  query: draft.query,
                  sort: draft.sort,
                })
              }
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
