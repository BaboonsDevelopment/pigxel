"use client";

import Image from "next/image";
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@pigxel/ui/components/input";
import { Heading } from "@pigxel/ui/components/typography";
import {
  CATEGORIES,
  PERIODS,
  SIZES,
  SORTS,
  TAGS,
  type Period,
  type Size,
  type Sort,
} from "../../constants";
import mascot from "../../../../../public/art/pigxel-maskot-searching.png";
import { PublishButton } from "./components/publish-button";
import { SizeMenu } from "./components/size-menu";
import { SortMenu } from "./components/sort-menu";

export function ExploreHeader({
  period,
  tags,
  tagCounts,
  onTagsChange,
  size,
  onSizeChange,
  animated,
  onAnimatedChange,
  onClear,
  sort,
  onSortChange,
  query,
  onQueryChange,
  guest,
}: {
  period: Period;
  tags: string[];
  tagCounts: Record<string, number> | null;
  onTagsChange: (tags: string[]) => void;
  size: Size;
  onSizeChange: (size: Size) => void;
  animated: boolean;
  onAnimatedChange: (animated: boolean) => void;
  onClear: () => void;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
  query: string;
  onQueryChange: (query: string) => void;
  guest: boolean;
}) {
  const toggle = (name: string) =>
    onTagsChange(
      name === CATEGORIES[0]
        ? []
        : TAGS.filter((t) => (t === name) !== tags.includes(t)),
    );
  const filtered =
    tags.length > 0 ||
    size !== SIZES[0].value ||
    animated ||
    period !== PERIODS[0].value ||
    sort !== SORTS[0].value ||
    query !== "";
  return (
    <header className="mb-12">
      <div className="flex items-center gap-1">
        <Heading
          as="h1"
          id="popular-heading"
          className="text-[2.5rem] font-semibold"
        >
          Explore
        </Heading>
        <Image
          src={mascot}
          alt=""
          width={140}
          height={116}
          priority
          className="-mt-6 -mb-11 h-auto w-[140px] shrink-0"
        />
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <InputGroup className="max-w-xs">
          <InputGroupText className="pr-0">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="size-4"
            >
              <circle cx="9" cy="9" r="5.5" />
              <path d="m13 13 3.5 3.5" />
            </svg>
          </InputGroupText>
          <InputGroupInput
            type="search"
            aria-label="Search"
            placeholder="Search projects, templates, assets…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </InputGroup>
        <PublishButton guest={guest} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3">
        <div
          role="group"
          aria-label="Category"
          className="flex flex-wrap gap-3"
        >
          {CATEGORIES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              aria-pressed={
                name === CATEGORIES[0] ? !tags.length : tags.includes(name)
              }
              className="flex h-9 items-center gap-1.5 rounded-lg border bg-background px-5 text-xs transition-[background-color,border-color,transform] duration-200 ease-out hover:bg-muted active:scale-95 aria-pressed:border-transparent aria-pressed:bg-pastel-pink motion-reduce:transition-none"
            >
              {name}
              {tagCounts && (
                <span className="text-muted-foreground tabular-nums">
                  {tagCounts[name] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <SortMenu sort={sort} onChange={onSortChange} />
          <SizeMenu size={size} onChange={onSizeChange} />
          <button
            type="button"
            aria-pressed={animated}
            onClick={() => onAnimatedChange(!animated)}
            className="flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3.5 text-xs transition-[background-color,border-color,transform] duration-200 ease-out hover:bg-muted active:scale-95 aria-pressed:border-transparent aria-pressed:bg-pastel-pink motion-reduce:transition-none"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
              className="size-3.5"
            >
              <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
              <path d="M6.75 6v4l3.5-2z" fill="currentColor" />
            </svg>
            Animated
          </button>
          <button
            type="button"
            onClick={onClear}
            aria-hidden={!filtered}
            tabIndex={filtered ? undefined : -1}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs text-muted-foreground transition-[opacity,transform,background-color,color] duration-200 ease-out hover:bg-muted hover:text-foreground active:scale-95 motion-reduce:transition-none ${filtered ? "" : "pointer-events-none -translate-x-1 opacity-0"}`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="size-3"
            >
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
            Clear
          </button>
        </div>
      </div>
    </header>
  );
}
