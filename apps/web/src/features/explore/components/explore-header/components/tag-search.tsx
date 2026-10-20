"use client";

import { useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@pigxel/ui/components/input";
import { PixelImage } from "@/components/ui/pixel-image";
import { ART_TAG_GROUPS, matchArtTags } from "../../../art-tags";
import { MAX_TAGS, QUERY_MAX } from "../../../constants";
import { CloseIcon, SearchIcon } from "./icons";
import { useDismiss } from "./menu-button";

const CHIP =
  "flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-sm text-[#4a2434] transition-colors";

/** Pastel chip colors; `picked` darkens the border for a chosen tag. */
const TONES = {
  pink: {
    idle: "border-[#f0c9d7] bg-[#fde8ef] text-[#8a2f55] hover:bg-[#fbd8e4]",
    picked: "border-[#8a2f55]",
  },
  peach: {
    idle: "border-[#f2cdbb] bg-[#fcebe2] text-[#94452a] hover:bg-[#f9dccd]",
    picked: "border-[#94452a]",
  },
  butter: {
    idle: "border-[#ecdba6] bg-[#fbf3d9] text-[#7d5f14] hover:bg-[#f7eac0]",
    picked: "border-[#7d5f14]",
  },
  mint: {
    idle: "border-[#bfdcc9] bg-[#e5f3ea] text-[#2c6a45] hover:bg-[#d4ebdc]",
    picked: "border-[#2c6a45]",
  },
  sky: {
    idle: "border-[#c3d3ef] bg-[#e7eefb] text-[#34558f] hover:bg-[#d8e3f7]",
    picked: "border-[#34558f]",
  },
  lilac: {
    idle: "border-[#d6c8ee] bg-[#f0e9fa] text-[#5d3d94] hover:bg-[#e5daf6]",
    picked: "border-[#5d3d94]",
  },
} as const;

type Tone = keyof typeof TONES;

const GROUP_TONES: Record<string, Tone> = {
  Characters: "pink",
  Mood: "pink",
  Fashion: "pink",
  Animals: "peach",
  Colors: "peach",
  Hobbies: "peach",
  Buildings: "butter",
  Interiors: "butter",
  Nature: "mint",
  Places: "mint",
  Games: "mint",
  Items: "sky",
  Vehicles: "sky",
  Animation: "sky",
  Creatures: "lilac",
  Spooky: "lilac",
  Style: "lilac",
  Format: "lilac",
  Abstract: "lilac",
};

/** Each tag takes the color of the first group it's listed in. */
const TAG_TONES = new Map<string, Tone>();
for (const [group, tags] of Object.entries(ART_TAG_GROUPS))
  for (const tag of tags)
    if (!TAG_TONES.has(tag)) TAG_TONES.set(tag, GROUP_TONES[group] ?? "pink");

const toneOf = (tag: string) => TONES[TAG_TONES.get(tag) ?? "pink"];

function Pin() {
  return (
    <PixelImage
      src="/art/pin-icon.png"
      alt=""
      width={16}
      height={16}
      className="size-4 shrink-0"
    />
  );
}

export function TagSearch({
  query,
  onQueryChange,
  onQuerySubmit,
  searching,
  tags,
  tagCounts,
  onTagsChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onQuerySubmit: () => void;
  searching: boolean;
  tags: string[];
  tagCounts: Record<string, number> | null;
  onTagsChange: (tags: string[]) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const root = useDismiss(focused, () => setFocused(false));
  const full = tags.length >= MAX_TAGS;
  const typedTag = query.startsWith("#")
    ? query.slice(1).trim().toLowerCase()
    : null;
  const matches = typedTag === null || full ? [] : matchArtTags(typedTag, tags);

  const add = (tag: string) => {
    if (full || tags.includes(tag)) return;
    onTagsChange([...tags, tag]);
    onQueryChange("");
    setActive(0);
  };

  return (
    <div ref={root} className="relative w-full sm:w-[400px] sm:shrink-0">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (typedTag !== null) {
            const pick = matches[active] ?? matches[0];
            if (pick) add(pick);
            return;
          }
          onQuerySubmit();
        }}
      >
        <InputGroup className="h-10 rounded-xl border-[#e7c6d2] text-base">
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
              <SearchIcon />
            )}
          </InputGroupText>
          <InputGroupInput
            type="search"
            role="combobox"
            aria-expanded={focused && matches.length > 0}
            aria-autocomplete="list"
            aria-label="Search arts and artists, or add a #tag"
            placeholder="Search arts, artists or #tags"
            size={1}
            maxLength={QUERY_MAX}
            value={query}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.preventDefault();
                onQueryChange("");
              }
              if (e.key === "ArrowDown" && matches.length) {
                e.preventDefault();
                setActive((a) => (a + 1) % matches.length);
              }
              if (e.key === "ArrowUp" && matches.length) {
                e.preventDefault();
                setActive((a) => (a - 1 + matches.length) % matches.length);
              }
              if (e.key === "Backspace" && !query && tags.length)
                onTagsChange(tags.slice(0, -1));
            }}
            className="[&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onQueryChange("")}
              className="mr-1.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <CloseIcon />
            </button>
          )}
        </InputGroup>
      </form>
      {focused && typedTag !== null && (
        <ul
          role="listbox"
          className="absolute top-full left-0 z-30 mt-2 w-full rounded-xl border bg-popover p-1.5 shadow-lg animate-in fade-in slide-in-from-top-1"
        >
          {full ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              You can add up to {MAX_TAGS} tags.
            </li>
          ) : matches.length ? (
            matches.map((tag, i) => (
              <li key={tag} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onClick={() => add(tag)}
                  className={cn(
                    "flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted",
                    i === active && "bg-pastel-pink-soft",
                  )}
                >
                  <Pin />
                  <span className="flex-1">#{tag.toLowerCase()}</span>
                  {tagCounts && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {tagCounts[tag] ?? 0}
                    </span>
                  )}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              No tag like that yet.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** The tags Explore is narrowed to; each one removes itself on click. */
export function TagChips({
  tags,
  onTagsChange,
  className,
}: {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  className?: string;
}) {
  if (!tags.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          aria-label={`Remove tag ${tag}`}
          title="Remove tag"
          onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
          className={cn(CHIP, toneOf(tag).idle, toneOf(tag).picked)}
        >
          <Pin />
          {tag}
        </button>
      ))}
      <span className="text-xs text-muted-foreground tabular-nums">
        {tags.length} of {MAX_TAGS} tags
      </span>
    </div>
  );
}

/** Tags with the most arts under the current filters, to start browsing. */
export function TrendingTags({
  tagCounts,
  onPick,
  limit = 8,
  className,
}: {
  tagCounts: Record<string, number> | null;
  onPick: (tag: string) => void;
  limit?: number;
  className?: string;
}) {
  const top = Object.entries(tagCounts ?? {})
    .filter(([tag, count]) => tag !== "All" && count > 0)
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .slice(0, limit);
  if (!top.length) return null;
  return (
    <nav
      aria-label="Popular tags"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <span className="mr-1 text-xs font-medium text-muted-foreground">
        Popular tags
      </span>
      {top.map(([tag, count]) => (
        <button
          key={tag}
          type="button"
          onClick={() => onPick(tag)}
          className={cn(CHIP, toneOf(tag).idle)}
        >
          #{tag.toLowerCase()}
          <span className="text-xs tabular-nums opacity-70">{count}</span>
        </button>
      ))}
    </nav>
  );
}
