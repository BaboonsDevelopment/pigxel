"use client";

import { useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@pigxel/ui/components/input";
import { PixelImage } from "@/components/ui/pixel-image";
import { MAX_TAGS, QUERY_MAX, TAGS } from "../../../constants";
import { CloseIcon, SearchIcon } from "./icons";
import { useDismiss } from "./menu-button";

const CHIP =
  "flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-sm text-[#4a2434] transition-colors";

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
  const matches =
    typedTag === null || full
      ? []
      : TAGS.filter(
          (t) => !tags.includes(t) && t.toLowerCase().includes(typedTag),
        );

  const add = (tag: string) => {
    if (full || tags.includes(tag)) return;
    onTagsChange([...tags, tag]);
    onQueryChange("");
    setActive(0);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-[17px] gap-y-3">
      <div ref={root} className="relative w-full sm:w-[426px] sm:shrink-0">
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
              placeholder="Add #tag…"
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
      <div className="flex flex-col gap-1 pt-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-label={`Remove tag ${tag}`}
              title="Remove tag"
              onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
              className={cn(
                CHIP,
                "border-[#7a3045] bg-[#fde2ea] hover:bg-[#fbd3df]",
              )}
            >
              <Pin />
              {tag}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          Add up to {MAX_TAGS} tags
        </span>
      </div>
    </div>
  );
}
