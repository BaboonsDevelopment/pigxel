"use client";

import { useId, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import {
  ASSET_SORTS,
  ACCESS,
  KINDS,
  MOTIONS,
  NO_ASSET_FILTERS,
  type AssetFilters,
} from "../filters";
import { CANVAS_SIZES } from "@/features/explore/constants";

type GalleryDensity = "medium" | "small";

export function GalleryResultsBar({
  count,
  noun,
  loading = false,
  filters,
  onFilters,
  density,
  onDensity,
}: {
  count: number | null;
  noun: "packs" | "assets";
  loading?: boolean;
  filters: AssetFilters;
  onFilters: (value: AssetFilters) => void;
  density: GalleryDensity;
  onDensity: (value: GalleryDensity) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="text-sm text-[#806775] tabular-nums">
        {loading
          ? `Updating ${noun}…`
          : count === null
            ? noun === "packs"
              ? "Packs"
              : "Assets"
            : `${count.toLocaleString()} ${count === 1 ? noun.slice(0, -1) : noun}`}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex h-9 items-center gap-2 rounded-lg px-2 text-sm text-[#4a2434] hover:bg-white">
          <span className="sr-only">Sort by</span>
          <select
            aria-label="Sort by"
            value={filters.sort}
            onChange={(event) =>
              onFilters({
                ...filters,
                sort: event.target.value as AssetFilters["sort"],
              })
            }
            className="h-full cursor-pointer appearance-none bg-transparent pr-6 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {ASSET_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="pointer-events-none absolute right-2 size-3.5"
          >
            <path d="m4 6 4 4 4-4" />
          </svg>
        </label>
        <div
          role="radiogroup"
          aria-label="Gallery density"
          className="flex h-9 gap-0.5 rounded-lg border border-[#e7c6d2] bg-white p-0.5"
        >
          {(
            [
              { value: "medium", label: "Comfortable", cells: 2 },
              { value: "small", label: "Compact", cells: 3 },
            ] as const
          ).map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-label={option.label}
              aria-checked={density === option.value}
              tabIndex={density === option.value ? 0 : -1}
              onClick={() => onDensity(option.value)}
              onKeyDown={(event) => {
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 1
                      : event.key === "ArrowLeft" || event.key === "ArrowRight"
                        ? 1 - index
                        : null;
                if (next === null) return;
                event.preventDefault();
                onDensity(next === 0 ? "medium" : "small");
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
                  [next]?.focus();
              }}
              className="flex items-center gap-1.5 rounded-md px-2 text-xs text-[#806775] transition-colors hover:text-foreground aria-checked:bg-[#fde5ee] aria-checked:text-primary sm:px-2.5"
            >
              <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3">
                <path
                  fill="currentColor"
                  d={
                    option.cells === 2
                      ? "M0 0h5v5H0zM7 0h5v5H7zM0 7h5v5H0zM7 7h5v5H7z"
                      : "M0 0h3v3H0zM4.5 0h3v3h-3zM9 0h3v3H9zM0 4.5h3v3H0zM4.5 4.5h3v3h-3zM9 4.5h3v3H9zM0 9h3v3H0zM4.5 9h3v3h-3zM9 9h3v3H9z"
                  }
                />
              </svg>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppliedAssetFilters({
  filters,
  onChange,
  tags,
  packs,
}: {
  filters: AssetFilters;
  onChange: (value: AssetFilters) => void;
  tags: { id: string; name: string }[];
  packs: { id: string; name: string }[];
}) {
  const chips: { key: string; label: string; remove: () => void }[] =
    filters.tags.map((id) => ({
      key: `tag:${id}`,
      label: `#${tags.find((tag) => tag.id === id)?.name ?? id}`,
      remove: () =>
        onChange({
          ...filters,
          tags: filters.tags.filter((tag) => tag !== id),
        }),
    }));
  if (filters.size !== "any")
    chips.push({
      key: "size",
      label:
        CANVAS_SIZES.find((size) => size.value === filters.size)?.label ??
        filters.size,
      remove: () => onChange({ ...filters, size: "any" }),
    });
  for (const [key, options] of [
    ["motion", MOTIONS],
    ["kind", KINDS],
    ["access", ACCESS],
  ] as const) {
    if (filters[key] !== "any")
      chips.push({
        key,
        label:
          options.find((option) => option.value === filters[key])?.label ??
          filters[key],
        remove: () => onChange({ ...filters, [key]: "any" }),
      });
  }
  if (filters.pack)
    chips.push({
      key: "pack",
      label:
        packs.find((pack) => pack.id === filters.pack)?.name ?? filters.pack,
      remove: () => onChange({ ...filters, pack: null }),
    });
  if (filters.favourites)
    chips.push({
      key: "favourites",
      label: "Favourites",
      remove: () => onChange({ ...filters, favourites: false }),
    });
  if (!chips.length) return null;
  return (
    <div
      aria-label="Applied filters"
      className="mt-3 flex flex-wrap items-center gap-2"
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          aria-label={`Remove ${chip.label} filter`}
          onClick={chip.remove}
          className="flex max-w-full items-center gap-2 rounded-full border border-[#ebcad8] bg-white px-3 py-1.5 text-xs text-[#704258] transition-colors hover:border-primary hover:bg-[#fff2f7]"
        >
          <span className="truncate">{chip.label}</span>
          <span aria-hidden="true">×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            ...NO_ASSET_FILTERS,
            query: filters.query,
            sort: filters.sort,
          })
        }
        className="px-2 py-1.5 text-xs text-primary underline-offset-4 hover:underline"
      >
        Clear filters
      </button>
    </div>
  );
}

/** Suggest tags without applying an unfinished hashtag to the results. */
export function GallerySearch({
  value,
  onChange,
  tags,
  selected,
  onTag,
  onBrowseTags,
  noun,
}: {
  value: string;
  onChange: (value: string) => void;
  tags: { id: string; name: string }[];
  selected: string[];
  onTag: (id: string, query: string) => void;
  onBrowseTags: () => void;
  noun: "packs" | "assets";
}) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [index, setIndex] = useState(0);
  const match = value.match(/(?:^|\s)#([^\s#]*)$/);
  const prefix = match?.[1]?.toLowerCase();
  const options =
    prefix === undefined || selected.length >= 10
      ? []
      : tags
          .filter(
            (tag) =>
              !selected.includes(tag.id) &&
              (tag.name.toLowerCase().includes(prefix) ||
                tag.id.includes(prefix)),
          )
          .slice(0, 8);
  const open = focused && !dismissed && !!match;
  const active = Math.min(index, options.length - 1);
  const select = (id: string) => {
    onTag(id, value.replace(/(?:^|\s)#[^\s#]*$/, "").trim());
    setDismissed(true);
  };
  return (
    <div className="relative min-w-0 flex-1">
      <div className="flex h-11 items-center gap-3 rounded-xl border border-[#e7c6d2] bg-white px-3.5 text-[#806775] transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          className="size-4 shrink-0"
        >
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4 4" />
        </svg>
        <input
          type="search"
          role="combobox"
          aria-label={`Search ${noun}`}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={
            open && options[active] ? `${listId}-${active}` : undefined
          }
          value={value}
          placeholder={
            tags.length ? `Search ${noun} or #tags…` : `Search ${noun}…`
          }
          maxLength={100}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            setIndex(0);
            setDismissed(false);
            onChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setDismissed(true);
              return;
            }
            if (
              match &&
              (event.key === "ArrowDown" || event.key === "ArrowUp")
            ) {
              event.preventDefault();
              setDismissed(false);
              setIndex((current) =>
                event.key === "ArrowDown"
                  ? (current + 1) % Math.max(1, options.length)
                  : (current - 1 + options.length) %
                    Math.max(1, options.length),
              );
            }
            if (event.key === "Enter" && open && options[active]) {
              event.preventDefault();
              select(options[active].id);
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-[#957d89] [&::-webkit-search-cancel-button]:appearance-none"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onChange("");
              setDismissed(true);
            }}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-lg hover:bg-muted"
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggested tags"
          className="absolute top-full z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border bg-white p-1.5 shadow-lg"
        >
          {options.map((tag, i) => (
            <li key={tag.id} role="presentation">
              <button
                type="button"
                role="option"
                id={`${listId}-${i}`}
                aria-selected={active === i}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(tag.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted",
                  active === i && "bg-[#fff2f7]",
                )}
              >
                <span className="text-primary">#</span>
                {tag.name}
              </button>
            </li>
          ))}
          {!options.length && (
            <li
              role="presentation"
              className="px-3 py-2.5 text-sm text-[#806775]"
            >
              {selected.length >= 10
                ? "You can select up to 10 tags."
                : "No matching tags."}
            </li>
          )}
          <li role="presentation" className="mt-1 border-t pt-1">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setDismissed(true);
                onBrowseTags();
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-xs text-primary hover:bg-muted"
            >
              Browse all filters →
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
