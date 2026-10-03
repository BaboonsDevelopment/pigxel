"use client";

import { useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { cn } from "@pigxel/ui/lib/utils";
import { Checkbox } from "@pigxel/ui/components/choice";
import { Textarea } from "@pigxel/ui/components/input";
import { MAX_REFERENCES } from "@/lib/ai/constants";
import { toReference } from "../flows/pictures";
import { ICONS } from "../icons";

type Props = {
  draft: string;
  onDraft: (text: string) => void;
  references: string[];
  onReferences: (references: string[]) => void;
  selectArea: boolean;
  onSelectArea: (on: boolean) => void;
  pending: boolean;
  onSend: (text: string) => void;
};

export function ChatComposer({
  draft,
  onDraft,
  references,
  onReferences,
  selectArea,
  onSelectArea,
  pending,
  onSend,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
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
      <div className="flex items-end gap-2">
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
        <Button
          type="button"
          variant="secondary"
          size="lg"
          title={`Attach pictures to draw from (up to ${MAX_REFERENCES})`}
          disabled={!canAttach}
          onClick={() => fileInput.current?.click()}
          className="w-11 shrink-0 px-0 text-muted-foreground hover:text-foreground"
        >
          {ICONS.attach}
        </Button>
        <Textarea
          rows={1}
          aria-label="Message"
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
          className="h-11 min-h-11 flex-1 resize-none"
        />
        <Button size="lg" disabled={!canSend}>
          Send
        </Button>
      </div>
    </form>
  );
}
