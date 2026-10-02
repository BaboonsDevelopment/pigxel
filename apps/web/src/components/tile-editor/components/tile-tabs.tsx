"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { readDraft } from "@/lib/pigxel-file/draft";
import { flattenDocument, parsePigxel } from "@/lib/pigxel-file/format";
import { LOCATION_LABELS, type TileLocation } from "@/lib/pigxel-file/location";
import { editorUrl, newTileUrl } from "@/lib/pigxel-file/open-tile";
import {
  movedTab,
  readTabs,
  tabAfterClosing,
  withTab,
  withoutTab,
  writeTabs,
} from "@/lib/pigxel-file/tabs";
import { forgetTile } from "../kept-tiles";

type Picture = { rgba: Uint8ClampedArray; w: number; h: number };

/** What a tab shows: the tile's name, where it lives, whether it has unsaved changes. */
type TabTile = {
  id: string;
  name: string;
  dirty: boolean;
  location: TileLocation | null;
};

/** Thumbnails of the other tabs' tiles, read from their drafts once per change. */
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
  } catch {
    // An unreadable tile shows no thumbnail.
  }
  pictures.set(id, { savedAt: draft.savedAt, picture });
  return picture;
}

/**
 * The tiles open in the editor, as tabs over the canvas: click one to switch
 * to it, middle-click or × to close it (its draft stays in My projects), drag
 * to reorder, + for a new tile. A tile opened from the editor opens next to
 * the one it was opened from.
 */
export function TileTabs({
  userId,
  current,
  revision,
  picture,
}: {
  userId: string;
  /** The tile being edited, with its name and state as they are now. */
  current: TabTile;
  /** Bumped by every change to the current tile, to redraw its thumbnail. */
  revision: number;
  /** The current tile's first frame, for its thumbnail. */
  picture: () => Picture;
}) {
  const router = useRouter();
  // Tiles deleted elsewhere drop out.
  const [tabs, setTabs] = useState(() =>
    withTab(
      readTabs(userId).filter(
        (id) => id === current.id || readDraft(userId, id),
      ),
      current.id,
    ),
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const activeTab = useRef<HTMLDivElement>(null);
  // In a block: newer browsers return a promise from scrollIntoView, which
  // React would take for a cleanup function.
  useEffect(() => {
    activeTab.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);
  useEffect(() => {
    if (!dragging) writeTabs(userId, tabs);
  }, [userId, tabs, dragging]);

  // The last tab stays: the editor always shows a tile.
  const closable = tabs.length > 1;
  const close = (id: string) => {
    if (!closable) return;
    const next = withoutTab(tabs, id);
    writeTabs(userId, next);
    forgetTile(id);
    if (id !== current.id) return setTabs(next);
    const after = tabAfterClosing(tabs, id);
    router.push(after ? editorUrl(after) : "/tiles");
  };

  // The current tile's thumbnail, redrawn after each change to it.
  const [shown, setShown] = useState(() => ({ revision, picture: picture() }));
  if (shown.revision !== revision) setShown({ revision, picture: picture() });

  return (
    <nav
      aria-label="Open tiles"
      className="flex h-9 shrink-0 items-end gap-0.5 overflow-x-auto border-b bg-background px-2 [scrollbar-width:none]"
    >
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
        const place = tile.location
          ? LOCATION_LABELS[tile.location.kind]
          : "this browser";
        return (
          <div
            key={id}
            ref={active ? activeTab : undefined}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", tile.name);
              setDragging(id);
            }}
            onDragOver={(e) => {
              if (!dragging) return;
              e.preventDefault();
              if (dragging === id) return;
              const box = e.currentTarget.getBoundingClientRect();
              const after = e.clientX > box.left + box.width / 2;
              const without = withoutTab(tabs, dragging);
              setTabs(
                movedTab(tabs, dragging, without.indexOf(id) + (after ? 1 : 0)),
              );
            }}
            onDrop={(e) => {
              if (dragging) e.preventDefault();
            }}
            onDragEnd={() => setDragging(null)}
            className={cn(
              "group relative -mb-px flex h-8 max-w-52 min-w-24 shrink-0 items-center rounded-t-md border border-b-0 text-xs transition-colors",
              active
                ? "border-border bg-muted text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              dragging === id && "opacity-50",
            )}
          >
            <Link
              href={editorUrl(id)}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              title={`${tile.name} · ${place}${tile.dirty ? " · unsaved changes" : ""}`}
              draggable={false}
              onClick={(e) => {
                if (active) e.preventDefault();
              }}
              onMouseDown={(e) => {
                // A middle click closes the tab instead of scrolling.
                if (e.button === 1) e.preventDefault();
              }}
              onAuxClick={(e) => {
                if (e.button !== 1) return;
                e.preventDefault();
                close(id);
              }}
              className="flex h-full min-w-0 flex-1 items-center gap-2 pr-1 pl-2.5 outline-none focus-visible:underline"
            >
              <Thumbnail
                picture={active ? shown.picture : draftPicture(userId, id)}
              />
              <span className="truncate">{tile.name || "Untitled"}</span>
            </Link>
            {closable ? (
              <button
                type="button"
                aria-label={`Close ${tile.name}`}
                title="Close tab (middle click)"
                onClick={() => close(id)}
                className={cn(
                  "mr-1 grid size-5 shrink-0 place-items-center rounded-sm text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
                  !active &&
                    !tile.dirty &&
                    "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                )}
              >
                {tile.dirty ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full bg-current group-hover:hidden"
                    />
                    <span
                      aria-hidden="true"
                      className="hidden group-hover:block"
                    >
                      ×
                    </span>
                  </>
                ) : (
                  <span aria-hidden="true">×</span>
                )}
              </button>
            ) : (
              // The only tab can't close; it still shows unsaved changes.
              <span className="mr-1 grid size-5 shrink-0 place-items-center text-muted-foreground">
                {tile.dirty && (
                  <span
                    aria-label="Unsaved changes"
                    className="size-2 rounded-full bg-current"
                  />
                )}
              </span>
            )}
          </div>
        );
      })}
      <Link
        href={newTileUrl(current.id)}
        aria-label="New tile"
        title="New tile"
        className="mb-1 ml-1 grid size-7 shrink-0 place-items-center rounded-md text-base text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        +
      </Link>
    </nav>
  );
}

/** A tile's first frame, tiny and crisp, on a checkerboard; redrawn when it changes. */
const Thumbnail = memo(function Thumbnail({
  picture,
}: {
  picture: Picture | null;
}) {
  return (
    <span className="grid size-5 shrink-0 place-items-center overflow-hidden rounded-[3px] bg-checker ring-1 ring-border">
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
