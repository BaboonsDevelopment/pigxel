"use client";

import { useEffect, useId, useRef, useState } from "react";

const EMOJIS = [
  "😍",
  "🥰",
  "😊",
  "😄",
  "😂",
  "🤩",
  "😮",
  "🤗",
  "❤️",
  "💖",
  "💕",
  "✨",
  "🔥",
  "🌟",
  "👏",
  "🙌",
  "👍",
  "💯",
  "🎨",
  "🖌️",
  "👾",
  "🎮",
  "🐷",
  "🐱",
  "🌸",
  "🌈",
  "🍀",
  "🍓",
  "☕",
  "🏰",
  "🌙",
  "🎉",
];

export function EmojiButton({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

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

  return (
    <div ref={root} className="relative flex">
      <button
        type="button"
        aria-label="Add emoji"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen(!open)}
        className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-expanded:text-primary"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          className="size-4"
        >
          <circle cx="8" cy="8" r="6.2" />
          <path d="M5.5 9.5c.6.9 1.5 1.4 2.5 1.4s1.9-.5 2.5-1.4" />
          <path d="M6 6.2h.01M10 6.2h.01" strokeWidth="1.8" />
        </svg>
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Emoji"
          className="absolute right-0 bottom-full z-30 mb-2 grid w-64 grid-cols-8 gap-0.5 rounded-xl border bg-popover p-1.5 shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150"
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={emoji}
              onClick={() => onPick(emoji)}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md text-base transition-transform hover:scale-125 hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
