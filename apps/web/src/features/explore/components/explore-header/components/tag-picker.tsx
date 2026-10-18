"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@pigxel/ui/lib/utils";
import { matchArtTags, MAX_ART_TAGS } from "../../../art-tags";

const MENU_MAX = 280;

/** Offered before anything is typed. */
const COMMON = [
  "pixel-art",
  "character",
  "landscape",
  "cute",
  "fantasy",
  "animal",
  "building",
  "food",
  "item",
  "game-asset",
  "animation",
  "retro",
];

/**
 * Tags for an art, typed and picked from the fixed list: chosen ones show as
 * chips, typing suggests matches. Up to MAX_ART_TAGS.
 */
export function TagPicker({
  value,
  onChange,
  className,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<{
    container: Element;
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const menuId = useId();

  const full = value.length >= MAX_ART_TAGS;
  const typed = text.trim();
  const suggestions = full
    ? []
    : typed
      ? matchArtTags(typed, value)
      : COMMON.filter((tag) => !value.includes(tag)).slice(0, 8);

  const show = () => {
    const field = root.current;
    const rect = field?.getBoundingClientRect();
    if (!field || !rect) return;
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const up = below < MENU_MAX && above > below;
    setPlace({
      container: field.closest("dialog") ?? document.body,
      left: rect.left,
      width: rect.width,
      top: up ? rect.top - 4 - Math.min(MENU_MAX, above) : rect.bottom + 4,
      maxHeight: Math.min(MENU_MAX, up ? above : below),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !menu.current?.contains(target))
        setOpen(false);
    };
    const hide = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open]);

  const add = (tag: string) => {
    if (full || value.includes(tag)) return;
    onChange([...value, tag]);
    setText("");
    setActive(0);
    input.current?.focus();
  };
  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  return (
    <div ref={root} className="relative">
      <div
        onClick={() => input.current?.focus()}
        className={cn(
          "flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20",
          className,
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-pastel-pink-soft py-0.5 pr-1 pl-2 text-xs text-primary"
          >
            #{tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(tag);
              }}
              className="flex size-4 cursor-pointer items-center justify-center rounded hover:bg-pastel-pink"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="size-2.5"
              >
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label="Add a tag"
          aria-expanded={open && (suggestions.length > 0 || !!typed)}
          aria-controls={open ? menuId : undefined}
          aria-autocomplete="list"
          disabled={full}
          value={text}
          maxLength={32}
          placeholder={
            full
              ? `Up to ${MAX_ART_TAGS} tags`
              : value.length
                ? "Add more…"
                : "Add tags, like house or sci-fi"
          }
          onFocus={show}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
            if (!open) show();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && suggestions.length) {
              e.preventDefault();
              setActive((a) => (a + 1) % suggestions.length);
            } else if (e.key === "ArrowUp" && suggestions.length) {
              e.preventDefault();
              setActive(
                (a) => (a - 1 + suggestions.length) % suggestions.length,
              );
            } else if (e.key === "Enter" || e.key === ",") {
              // Inside a form, Enter adds a tag instead of submitting.
              if (typed || e.key === ",") e.preventDefault();
              const pick = suggestions[active];
              if (typed && pick) add(pick);
            } else if (e.key === "Backspace" && !text && value.length) {
              remove(value[value.length - 1]!);
            } else if (e.key === "Escape" && open) {
              e.stopPropagation();
              setOpen(false);
            }
          }}
          className="h-7 min-w-24 flex-1 bg-transparent px-0.5 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
          {value.length}/{MAX_ART_TAGS}
        </span>
      </div>
      {open &&
        place &&
        (suggestions.length > 0 || typed) &&
        createPortal(
          <ul
            ref={menu}
            id={menuId}
            role="listbox"
            aria-label="Tags"
            style={{
              left: place.left,
              top: place.top,
              width: place.width,
              maxHeight: place.maxHeight,
            }}
            className="fixed z-50 overflow-y-auto rounded-lg border bg-popover p-1 text-sm shadow-lg"
          >
            {suggestions.length ? (
              suggestions.map((tag, i) => (
                <li
                  key={tag}
                  role="option"
                  aria-selected={i === active}
                  // Keep the focus in the input while picking.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(tag)}
                  onMouseEnter={() => setActive(i)}
                  className="cursor-pointer rounded-md px-3 py-1.5 aria-selected:bg-secondary"
                >
                  #{tag}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                No tag “{typed}”. Tags come from a fixed list; try another word.
              </li>
            )}
          </ul>,
          place.container,
        )}
    </div>
  );
}
