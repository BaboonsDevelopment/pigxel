"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Button, IconButton } from "@pigxel/ui/components/button";
import { cn } from "@pigxel/ui/lib/utils";
import { Checkbox } from "@pigxel/ui/components/choice";
import { Textarea } from "@pigxel/ui/components/input";
import { MAX_REFERENCES } from "../../../constants";
import { toReference } from "../flows/pictures";
import { ICONS } from "../icons";

type Props = {
  autoFocus?: boolean;
  draft: string;
  onDraft: (text: string) => void;
  references: string[];
  onReferences: (references: string[]) => void;
  selectArea: boolean;
  onSelectArea: (on: boolean) => void;
  pending: boolean;
  onSend: (text: string) => void;
  onStop?: () => void;
};

export function ChatComposer({
  autoFocus,
  draft,
  onDraft,
  references,
  onReferences,
  selectArea,
  onSelectArea,
  pending,
  onSend,
  onStop,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);

  // Grow with the text, line by line; max-h caps it and then it scrolls.
  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);
  const canSend = !pending && draft.trim().length > 0;
  const canAttach = references.length < MAX_REFERENCES;

  const submit = () => {
    if (!canSend) return;
    onSend(draft.trim());
    onDraft("");
  };

  const attach = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    const added = await Promise.all(
      images.slice(0, MAX_REFERENCES - references.length).map(toReference),
    );
    const found = added.filter((r): r is string => !!r);
    if (found.length) onReferences([...references, ...found]);
  };

  return (
    <form
      className={cn(
        "flex shrink-0 flex-col gap-2 border-t p-3",
        dragging && "bg-muted",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files") || !canAttach) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(false);
        void attach([...e.dataTransfer.files]);
      }}
    >
      <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none hover:text-foreground">
        <Checkbox
          checked={selectArea}
          onChange={(e) => onSelectArea(e.target.checked)}
        />
        Select area
      </label>
      {references.length > 0 && (
        <ul className="flex gap-2">
          {references.map((reference, i) => (
            <li key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimize */}
              <img
                src={reference}
                alt={`Reference ${i + 1}`}
                className="size-14 rounded-md border object-cover"
              />
              <button
                type="button"
                title="Remove"
                onClick={() =>
                  onReferences(references.filter((_, j) => j !== i))
                }
                className="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full border bg-background text-xs leading-none text-muted-foreground shadow-sm hover:text-foreground"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-xl border border-input bg-background transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
        <Textarea
          ref={textarea}
          rows={1}
          aria-label="Message"
          autoFocus={autoFocus}
          placeholder="Ask for a change…"
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={(e) => {
            const files = [...e.clipboardData.files];
            if (!files.some((f) => f.type.startsWith("image/")) || !canAttach)
              return;
            e.preventDefault();
            void attach(files);
          }}
          className="block max-h-40 min-h-0 overflow-y-auto rounded-xl border-0 bg-transparent px-3 pt-2.5 pb-1 text-sm focus-visible:ring-0"
        />
        <div className="flex items-center justify-between px-1.5 pb-1.5">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void attach([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
          <IconButton
            label={`Attach pictures to draw from (up to ${MAX_REFERENCES})`}
            disabled={!canAttach}
            onClick={() => fileInput.current?.click()}
            className="disabled:pointer-events-none disabled:opacity-50"
          >
            {ICONS.attach}
          </IconButton>
          {onStop ? (
            <IconButton
              label="Stop this request. Anything it hasn’t drawn yet won’t be added"
              variant="secondary"
              round
              onClick={onStop}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3">
                <rect
                  x="3"
                  y="3"
                  width="10"
                  height="10"
                  rx="1.5"
                  fill="currentColor"
                />
              </svg>
            </IconButton>
          ) : (
            <Button
              type="submit"
              size="icon"
              aria-label="Send"
              title="Send"
              disabled={!canSend}
              className="rounded-full"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                className="size-4"
              >
                <path
                  d="M8 13V3M3.5 7.5 8 3l4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
