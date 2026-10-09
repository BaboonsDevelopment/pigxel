"use client";

import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { cn } from "@pigxel/ui/lib/utils";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import {
  LINK_ACCESS,
  LINK_LABELS,
  shareLinkPath,
  type LinkAccess,
} from "../../../sharing";
import { EditorSelect } from "@/features/editor/components/editor-select";
import { PILL, SECTION_TITLE } from "../constants";

const LINK_OPTIONS = LINK_ACCESS.map((access) => ({
  value: access,
  label: LINK_LABELS[access],
}));

export function LinkAccessSection({
  link,
  resetting,
  onAccessChange,
  onReset,
}: {
  link: { access: LinkAccess; token: string | null };
  resetting: boolean;
  onAccessChange: (access: LinkAccess) => void;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url =
    link.token && !resetting && typeof window !== "undefined"
      ? new URL(shareLinkPath(link.token), window.location.origin).href
      : null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const reset = async () => {
    const confirmed = await confirmDialog({
      title: "Reset the link?",
      message:
        "The old link stops working, and people who joined with it lose access. People you invited by username keep theirs.",
      confirmLabel: "Reset link",
    });
    if (confirmed) onReset();
  };

  return (
    <section aria-labelledby="share-link" className="border-t pt-5">
      <div className="flex items-center gap-3">
        <h3 id="share-link" className={cn(SECTION_TITLE, "mb-0 mr-auto")}>
          Link access
        </h3>
        {link.access !== "off" && (
          <button
            type="button"
            disabled={resetting}
            onClick={() => void reset()}
            className="cursor-pointer text-xs text-link-accent transition-colors hover:text-lavender-foreground disabled:opacity-50"
          >
            Reset link
          </button>
        )}
        <EditorSelect
          ariaLabel="Link access"
          value={link.access}
          options={LINK_OPTIONS}
          onChange={(value) => onAccessChange(value as LinkAccess)}
          className={cn(
            PILL,
            "w-auto",
            link.access === "off" &&
              "bg-secondary text-muted-foreground hover:bg-muted",
          )}
        />
      </div>
      {link.access !== "off" && (
        <div className="mt-2 flex gap-2 animate-in fade-in duration-150">
          <span className="flex h-9 min-w-0 flex-1 items-center rounded-lg border px-3 text-xs text-muted-foreground">
            <span className="truncate">{url ?? "Making a link…"}</span>
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={!url}
            onClick={() => void copy()}
            className="w-28"
          >
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      )}
    </section>
  );
}
