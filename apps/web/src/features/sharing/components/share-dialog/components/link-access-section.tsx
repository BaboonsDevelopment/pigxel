"use client";

import { cn } from "@pigxel/ui/lib/utils";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { ModalButton } from "@/components/ui/modal-button";
import { LINK_COPIED, showSnackbar } from "@/components/ui/snackbar";
import { LINK_LABELS, shareLinkPath, type LinkAccess } from "../../../sharing";
import { SECTION_TITLE } from "../constants";

const LINK_OPTIONS = ["view", "edit"] as const;

const LINK_HINTS: Record<(typeof LINK_OPTIONS)[number], string> = {
  view: "Anyone with the link can view this project.",
  edit: "Anyone with the link can edit this project.",
};

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
  const on = link.access !== "off";
  const url =
    on && link.token && !resetting && typeof window !== "undefined"
      ? new URL(shareLinkPath(link.token), window.location.origin).href
      : null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showSnackbar(LINK_COPIED, { tone: "action" });
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
    <>
      <section aria-labelledby="share-url">
        <div className="flex items-center justify-between">
          <h3 id="share-url" className={SECTION_TITLE}>
            Shareable URL
          </h3>
          {on && (
            <button
              type="button"
              disabled={resetting}
              onClick={() => void reset()}
              className="mb-2 text-xs text-link-accent transition-colors hover:text-lavender-foreground disabled:opacity-50"
            >
              Reset link
            </button>
          )}
        </div>
        <span
          className={cn(
            "flex h-12 min-w-0 items-center rounded-xl border bg-background px-4 text-sm",
            !url && "text-muted-foreground",
          )}
        >
          <span className="truncate">
            {url ?? (on ? "Making a link…" : "No link yet")}
          </span>
        </span>
        <div className="mt-3 flex justify-end">
          {on ? (
            <ModalButton disabled={!url} onClick={() => void copy()}>
              Copy Link
            </ModalButton>
          ) : (
            <ModalButton onClick={() => onAccessChange("view")}>
              Create Link
            </ModalButton>
          )}
        </div>
      </section>
      <section aria-labelledby="share-link">
        <h3 id="share-link" className={SECTION_TITLE}>
          Link access
        </h3>
        <div role="radiogroup" className="grid grid-cols-2 gap-2">
          {LINK_OPTIONS.map((access) => (
            <button
              key={access}
              type="button"
              role="radio"
              aria-checked={link.access === access}
              onClick={() => onAccessChange(access)}
              className={cn(
                "h-11 rounded-xl border text-sm transition-colors",
                link.access === access
                  ? "border-primary-soft bg-pastel-pink-soft font-semibold"
                  : "bg-background hover:bg-pink-base",
              )}
            >
              {LINK_LABELS[access]}
            </button>
          ))}
        </div>
        {link.access !== "off" && (
          <p className="mt-2 text-xs text-muted-foreground">
            {LINK_HINTS[link.access]}
          </p>
        )}
      </section>
    </>
  );
}
