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
  QUERY_MAX,
  SIZES,
  SORTS,
  TAGS,
  type Feed,
  type Period,
  type Size,
  type Sort,
} from "../../constants";
import mascot from "../../../../../public/art/pigxel-maskot-searching.png";
import { PublishButton } from "./components/publish-button";
import { FeedSwitch } from "./components/feed-switch";
import { OptionMenu } from "./components/option-menu";
import { SortMenu } from "./components/sort-menu";

export function ExploreHeader({
  feed,
  onFeedChange,
  period,
  onPeriodChange,
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
  onQuerySubmit,
  searching,
  guest,
}: {
  feed: Feed;
  onFeedChange: (feed: Feed) => void;
  period: Period;
  onPeriodChange: (period: Period) => void;
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
  onQuerySubmit: () => void;
  searching: boolean;
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
        <form
          role="search"
          className="w-full max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            onQuerySubmit();
          }}
        >
          <InputGroup>
            <InputGroupText className="pr-0">
              {searching ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  className="size-4 animate-spin motion-reduce:animate-none"
                >
                  <path d="M10 3.5a6.5 6.5 0 1 1-6.5 6.5" />
                </svg>
              ) : (
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
              )}
            </InputGroupText>
            <InputGroupInput
              type="search"
              aria-label="Search arts, tags or artists"
              placeholder="Search arts, tags or artists…"
              maxLength={QUERY_MAX}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault();
                  onQueryChange("");
                }
              }}
              className="[&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onQueryChange("")}
                className="mr-1.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors animate-in fade-in hover:bg-muted hover:text-foreground"
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
              </button>
            )}
          </InputGroup>
        </form>
        <div className="flex items-center gap-3">
          <FeedSwitch feed={feed} onChange={onFeedChange} />
          <PublishButton guest={guest} />
        </div>
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
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-5 text-xs transition-[background-color,border-color,transform] duration-200 ease-out hover:bg-muted active:scale-95 aria-pressed:border-transparent aria-pressed:bg-pastel-pink motion-reduce:transition-none"
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
          <SortMenu
            sort={sort}
            onChange={onSortChange}
            size={size}
            onSizeChange={onSizeChange}
            animated={animated}
            onAnimatedChange={onAnimatedChange}
          />
          <div
            aria-hidden={sort !== SORTS[0].value}
            inert={sort !== SORTS[0].value}
            className={`grid overflow-x-clip transition-[grid-template-columns,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${sort === SORTS[0].value ? "grid-cols-[1fr]" : "-ml-3 grid-cols-[0fr] opacity-0"}`}
          >
            <div className="min-w-0 whitespace-nowrap">
              <OptionMenu
                label="Period"
                options={PERIODS}
                value={period}
                onChange={onPeriodChange}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-hidden={!filtered}
            tabIndex={filtered ? undefined : -1}
            className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs text-muted-foreground transition-[opacity,transform,background-color,color] duration-200 ease-out hover:bg-muted hover:text-foreground active:scale-95 motion-reduce:transition-none ${filtered ? "" : "pointer-events-none -translate-x-1 opacity-0"}`}
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
