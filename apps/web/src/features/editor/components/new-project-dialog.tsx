"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { Input, Textarea } from "@pigxel/ui/components/input";
import { textLinkClassName } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { canUseAi } from "@/features/billing/actions";
import { PremiumBadge } from "@/features/billing/components/premium-badge";
import { keepStartOptions, MAX_START_PROMPT } from "../start-options";
import { createTile } from "@/features/tiles/create-tile";
import { readNewTileDefaults } from "@/features/tiles/new-tile-defaults";
import { MAX_PIGXEL_SIZE } from "@/lib/pigxel-file/format";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { openTabAfter } from "@/lib/pigxel-file/tabs";
import { SIZE_LABEL, SizeField } from "./size-controls";

type Fill = "transparent" | "white" | "custom";

const DEFAULT_SIZE = 32;

/** A choice button in the new-project modals; `on` when it's picked. */
export const choiceClass = (on: boolean) =>
  cn(
    "flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-1.5 text-sm whitespace-nowrap transition-colors",
    on
      ? "border-primary-soft bg-pastel-pink-soft font-semibold"
      : "bg-background hover:bg-pink-base",
  );

type FormProps = {
  userId: string;
  from?: string;
  /** Generate with AI: opens with the prompt shown and asks for one. */
  ai?: boolean;
  /** Whether the plan includes AI, when the caller already knows. */
  aiAllowed?: boolean;
  /** The folder the new project goes into. */
  folder?: { id: string; name: string };
};

/**
 * Creates a project in Pigxel cloud and opens it. `from` is the editor tab
 * the new one opens next to; without it the project opens on its own.
 */
export function NewProjectDialog({
  onClose,
  ...props
}: FormProps & { onClose: () => void }) {
  return (
    <Dialog onClose={onClose} size="md" portal>
      <NewProjectForm {...props} />
    </Dialog>
  );
}

function NewProjectForm({
  userId,
  from,
  ai = false,
  aiAllowed,
  folder,
}: FormProps) {
  const router = useRouter();
  const { close } = useDialog();
  const [defaults] = useState(() => readNewTileDefaults(userId));
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aiOpen, setAiOpen] = useState(ai);
  const [aiAccess, setAiAccess] = useState<boolean | null>(
    ai ? true : (aiAllowed ?? null),
  );
  const [width, setWidth] = useState(String(defaults.width));
  const [height, setHeight] = useState(String(defaults.height));
  const [fill, setFill] = useState<Fill>(
    defaults.background === "white" ? "white" : "transparent",
  );
  const [custom, setCustom] = useState("#f8dde6");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** An empty box means the size its placeholder shows. */
  const sizeOf = (value: string) => {
    const n = value.trim() === "" ? DEFAULT_SIZE : Number(value);
    return Number.isInteger(n) && n >= 1 && n <= MAX_PIGXEL_SIZE ? n : null;
  };

  const create = async () => {
    const w = sizeOf(width);
    const h = sizeOf(height);
    if (!w || !h)
      return setError(`Use a size from 1 to ${MAX_PIGXEL_SIZE} pixels.`);
    const asked = prompt.trim();
    if (ai && !asked) return setError("Describe what the AI should draw.");
    // The AI runs only when its section is open, allowed and filled in.
    const generate = aiOpen && aiAccess === true && asked !== "";
    setBusy(true);
    setError(null);
    const result = await createTile({
      userId,
      name: name.trim() || "Untitled",
      width: w,
      height: h,
      background: fill === "transparent" ? "transparent" : "white",
      fill: fill === "custom" ? custom : undefined,
      folder,
      start: generate ? "ai" : undefined,
    });
    if ("error" in result) {
      setError(result.error);
      setBusy(false);
      return;
    }
    if (from) openTabAfter(userId, result.draftId, from);
    if (generate) keepStartOptions(result.draftId, { prompt: asked });
    const url = editorUrl(result.draftId);
    router.push(generate ? `${url}&start=ai` : url);
    close();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
      className="flex min-h-0 flex-col"
    >
      <ModalHeader title={ai ? "Generate with AI" : "Create New Project"} />
      <DialogBody className="grid gap-5 py-5">
        {ai && <PromptField value={prompt} onChange={setPrompt} required />}
        <label className="block">
          <span className={SIZE_LABEL}>Project name</span>
          <Input
            autoFocus={!ai}
            placeholder="My pixel art"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl px-4"
          />
        </label>
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <SizeField
              id="new-w"
              label="Width"
              unit="px"
              placeholder={String(DEFAULT_SIZE)}
              value={width}
              onChange={setWidth}
            />
          </div>
          <span
            aria-hidden="true"
            className="flex h-14 items-center text-muted-foreground"
          >
            ×
          </span>
          <div className="min-w-0 flex-1">
            <SizeField
              id="new-h"
              label="Height"
              unit="px"
              placeholder={String(DEFAULT_SIZE)}
              value={height}
              onChange={setHeight}
            />
          </div>
        </div>
        <fieldset>
          <legend className={SIZE_LABEL}>Background</legend>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              aria-pressed={fill === "transparent"}
              onClick={() => setFill("transparent")}
              className={choiceClass(fill === "transparent")}
            >
              <span className="size-4 shrink-0 rounded border bg-checker" />
              Transparent
            </button>
            <button
              type="button"
              aria-pressed={fill === "white"}
              onClick={() => setFill("white")}
              className={choiceClass(fill === "white")}
            >
              <span className="size-4 shrink-0 rounded border bg-white" />
              White
            </button>
            <label
              className={cn(
                choiceClass(fill === "custom"),
                "relative cursor-pointer",
              )}
            >
              <span
                className="size-4 shrink-0 rounded border"
                style={{ backgroundColor: custom }}
              />
              Custom
              <input
                type="color"
                aria-label="Custom background color"
                value={custom}
                onClick={() => setFill("custom")}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setFill("custom");
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </fieldset>
        {!ai && (
          <div className="grid gap-3">
            <button
              type="button"
              aria-expanded={aiOpen}
              onClick={() => {
                setAiOpen(!aiOpen);
                if (aiAccess === null)
                  void canUseAi().then(setAiAccess, () => setAiAccess(true));
              }}
              className="flex h-11 w-full items-center gap-2 rounded-xl border bg-background px-4 text-sm font-semibold transition-colors hover:bg-pink-base"
            >
              Create with AI
              <PremiumBadge />
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className={cn(
                  "ml-auto size-4 text-muted-foreground transition-transform",
                  aiOpen && "rotate-180",
                )}
                fill="none"
              >
                <path
                  d="m4 6 4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {aiOpen &&
              (aiAccess === null ? (
                <p className="text-sm text-muted-foreground">
                  Checking your plan…
                </p>
              ) : aiAccess ? (
                <PromptField value={prompt} onChange={setPrompt} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Creating with AI comes with the paid plans.{" "}
                  <Link href="/pricing" className={textLinkClassName}>
                    Upgrade
                  </Link>
                </p>
              ))}
          </div>
        )}
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={busy}>
          {busy
            ? "Creating…"
            : ai || (aiOpen && aiAccess && prompt.trim())
              ? "Generate"
              : "Create"}
        </ModalButton>
      </DialogFooter>
    </form>
  );
}

function PromptField({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className={SIZE_LABEL}>What should the AI draw?</span>
      <Textarea
        autoFocus
        required={required}
        rows={3}
        placeholder="A cozy cottage with a red roof, pine trees and a stone path"
        maxLength={MAX_START_PROMPT}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="resize-none rounded-xl px-4 py-3"
      />
    </label>
  );
}
