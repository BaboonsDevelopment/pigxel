"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useId, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { readDraft, removeDraft } from "@/lib/pigxel-file/draft";
import { flattenDocument, parsePigxel } from "@/lib/pigxel-file/format";
import {
  CLOUD_LABEL,
  NOT_SAVED_LABEL,
  type TileLocation,
} from "@/lib/pigxel-file/location";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { useDismiss } from "@/features/explore/components/explore-header/components/menu-button";
import {
  readTabs,
  tabAfterClosing,
  withTab,
  withoutTab,
  writeTabs,
} from "@/lib/pigxel-file/tabs";
import { forgetTile } from "../kept-tiles";
import { confirmUnsaved } from "./unsaved-dialog";

type Picture = { rgba: Uint8ClampedArray; w: number; h: number };

type TabTile = {
  id: string;
  name: string;
  dirty: boolean;
  location: TileLocation | null;
};

const pictures = new Map<
  string,
  { savedAt: number; picture: Picture | null }
>();

function draftPicture(userId: string, id: string): Picture | null {
  const draft = readDraft(userId, id);
  if (!draft) return null;
  const cached = pictures.get(id);
  if (cached?.savedAt === draft.savedAt) return cached.picture;
  let picture: Picture | null = null;
  try {
    const doc = parsePigxel(draft.file);
    picture = { rgba: flattenDocument(doc), w: doc.width, h: doc.height };
  } catch {}
  pictures.set(id, { savedAt: draft.savedAt, picture });
  return picture;
}

/**
 * The open tiles, behind the chevron next to the file name: switch to one,
 * close one, or start a new tile. Replaces the old draggable tab strip.
 */
export function FileSwitcher({
  userId,
  current,
  revision,
  picture,
  onSave,
  onNew,
}: {
  onSave: () => Promise<boolean>;
  onNew: () => void;
  userId: string;
  current: TabTile;
  revision: number;
  picture: () => Picture;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const root = useDismiss(open, () => setOpen(false));
  const menuId = useId();
  const [tabs, setTabs] = useState(() =>
    withTab(
      readTabs(userId).filter(
        (id) => id === current.id || readDraft(userId, id),
      ),
      current.id,
    ),
  );
  useEffect(() => writeTabs(userId, tabs), [userId, tabs]);

  const closable = tabs.length > 1;
  const close = async (id: string) => {
    if (!closable) return;
    if (id === current.id && current.dirty && current.location) {
      const choice = await confirmUnsaved(current.name);
      if (!choice) return;
      if (choice === "save" && !(await onSave())) return;
      if (choice === "discard") removeDraft(userId, id);
    }
    const next = withoutTab(tabs, id);
    writeTabs(userId, next);
    forgetTile(id);
    if (id !== current.id) return setTabs(next);
    const after = tabAfterClosing(tabs, id);
    router.push(after ? editorUrl(after) : "/tiles");
  };

  const [shown, setShown] = useState(() => ({ revision, picture: picture() }));
  if (open && shown.revision !== revision)
    setShown({ revision, picture: picture() });

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`Open files (${tabs.length})`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title="Open files"
        onClick={() => setOpen(!open)}
        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-3.5"
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
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Open files"
          className="absolute top-full left-0 z-50 mt-2 w-72 rounded-xl border bg-popover p-1.5 shadow-lg"
        >
          <p className="px-2 pt-1 pb-1.5 text-[11px] text-muted-foreground">
            Open files
          </p>
          <ul className="max-h-80 overflow-y-auto">
            {tabs.map((id) => {
              const active = id === current.id;
              const draft = active ? null : readDraft(userId, id);
              const tile: TabTile | null = active
                ? current
                : draft && {
                    id,
                    name: draft.name,
                    dirty: draft.dirty,
                    location: draft.location,
                  };
              if (!tile) return null;
              return (
                <li key={id} role="none" className="group flex items-center">
                  <Link
                    href={editorUrl(id)}
                    prefetch={false}
                    role="menuitem"
                    aria-current={active ? "page" : undefined}
                    onClick={(e) => {
                      if (active) e.preventDefault();
                      setOpen(false);
                    }}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted",
                      active && "bg-[#fde2ea] hover:bg-[#fde2ea]",
                    )}
                  >
                    <Thumbnail
                      picture={
                        active ? shown.picture : draftPicture(userId, id)
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {tile.name || "Untitled"}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {tile.location ? CLOUD_LABEL : NOT_SAVED_LABEL}
                        {tile.dirty && " · unsaved changes"}
                      </span>
                    </span>
                  </Link>
                  {closable && (
                    <button
                      type="button"
                      aria-label={`Close ${tile.name}`}
                      title="Close"
                      onClick={() => void close(id)}
                      className="ml-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
                    >
                      ×
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNew();
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg border-t px-2 py-2 text-left text-sm hover:bg-muted"
          >
            <span aria-hidden="true" className="grid size-6 place-items-center">
              +
            </span>
            New tile…
          </button>
        </div>
      )}
    </div>
  );
}

const Thumbnail = memo(function Thumbnail({
  picture,
}: {
  picture: Picture | null;
}) {
  return (
    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-checker ring-1 ring-border">
      {picture && (
        <canvas
          aria-hidden="true"
          width={picture.w}
          height={picture.h}
          className="size-full object-contain [image-rendering:pixelated]"
          ref={(canvas) => {
            canvas
              ?.getContext("2d")
              ?.putImageData(
                new ImageData(
                  new Uint8ClampedArray(picture.rgba),
                  picture.w,
                  picture.h,
                ),
                0,
                0,
              );
          }}
        />
      )}
    </span>
  );
});
