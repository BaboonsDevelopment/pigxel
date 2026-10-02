"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { searchAll } from "@/app/(app)/topbar-actions";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { useCloudTileActions } from "@/components/tiles/tile-actions";
import { listDrafts } from "@/lib/pigxel-file/draft";
import { useDraftsLoaded } from "@/lib/pigxel-file/use-drafts";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import type { SearchResults } from "@/lib/search/server";
import { SearchIcon } from "./icons";

type Result = {
  key: string;
  group: "Projects" | "Artists";
  title: string;
  detail: string;
  thumbnail?: string | null;
  avatar?: { name: string; url: string | null };
  go: () => void;
};

const EMPTY: SearchResults = { tiles: [], artists: [] };

/**
 * The top bar's search: a round button (or ⌘K / Ctrl+K) opening a dialog
 * that finds your projects, in this browser and in Pigxel cloud, and artists.
 */
export function SearchButton({ userId }: { userId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        dialog.current?.showModal();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Search"
        aria-keyshortcuts="Control+K Meta+K"
        title="Search (Ctrl K)"
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
        className="flex size-10 items-center justify-center rounded-full border bg-white/80 text-foreground shadow-sm transition-colors hover:bg-white"
      >
        <SearchIcon />
      </button>
      <dialog
        ref={dialog}
        aria-label="Search"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // A click on the backdrop lands on the dialog itself.
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="mx-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] rounded-2xl border bg-popover p-0 text-foreground shadow-2xl backdrop:bg-foreground/25 backdrop:backdrop-blur-[2px]"
      >
        {open && (
          <SearchPanel userId={userId} close={() => dialog.current?.close()} />
        )}
      </dialog>
    </>
  );
}

function SearchPanel({ userId, close }: { userId: string; close: () => void }) {
  const router = useRouter();
  const cloud = useCloudTileActions(userId);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string } & SearchResults>({
    query: "",
    ...EMPTY,
  });
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  // Tiles kept in this browser are listed once they are read.
  useDraftsLoaded(userId);

  // Asks the server once typing pauses; answers for older text are ignored below.
  useEffect(() => {
    const text = query.trim();
    if (!text || text === "@") return;
    const timer = window.setTimeout(
      () =>
        startTransition(async () => {
          const results = await searchAll(text);
          setFound({ query: text, ...results });
        }),
      200,
    );
    return () => window.clearTimeout(timer);
  }, [query]);

  const text = query.trim().toLowerCase();
  // "@ada" looks for people by @username only.
  const handleMode = text.startsWith("@");
  const server = text && found.query.toLowerCase() === text ? found : EMPTY;
  const local =
    text && !handleMode
      ? listDrafts(userId)
          .filter(
            (draft) =>
              draft.location?.kind !== "cloud" &&
              draft.name.toLowerCase().includes(text),
          )
          .slice(0, 6)
      : [];

  const results: Result[] = [
    ...local.map((draft): Result => ({
      key: `local:${draft.id}`,
      group: "Projects",
      title: draft.name,
      detail:
        draft.location?.kind === "drive" ? "Google Drive" : "In this browser",
      go: () => router.push(editorUrl(draft.id)),
    })),
    ...server.tiles.map((tile): Result => ({
      key: `cloud:${tile.id}`,
      group: "Projects",
      title: tile.name,
      detail: `Pigxel cloud · ${tile.width} × ${tile.height}`,
      thumbnail: tile.thumbnail,
      go: () => void cloud.open(tile),
    })),
    ...server.artists.map((artist): Result => ({
      key: `artist:${artist.id}`,
      group: "Artists",
      title: handleMode ? `@${artist.username}` : artist.name,
      detail: handleMode ? artist.name : `@${artist.username}`,
      avatar: { name: artist.name, url: artist.avatarUrl },
      go: () => router.push(`/u/${artist.username}`),
    })),
  ];
  const current = Math.min(active, Math.max(results.length - 1, 0));

  const choose = (result: Result) => {
    result.go();
    if (!result.key.startsWith("cloud:")) close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(
        (current + step + results.length) % Math.max(results.length, 1),
      );
    } else if (event.key === "Enter" && results[current]) {
      event.preventDefault();
      choose(results[current]);
    }
  };

  const optionId = (i: number) => `${listId}-${i}`;
  return (
    <div>
      <div className="flex items-center gap-3 border-b px-4">
        <SearchIcon />
        <input
          autoFocus
          type="search"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={
            results.length > 0 ? optionId(current) : undefined
          }
          aria-label="Search projects, or @username for artists"
          placeholder="Search projects, or @username for artists…"
          value={query}
          maxLength={50}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
        <kbd className="rounded-md border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          Esc
        </kbd>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {cloud.error && (
          <p className="px-3 py-2 text-sm text-destructive">{cloud.error}</p>
        )}
        {!text ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Find your projects and artists by name. Start with{" "}
            <kbd className="font-mono text-foreground">@</kbd> to look up an
            artist by username.
          </p>
        ) : text === "@" ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Type a username after @, e.g. @pixel_ada.
          </p>
        ) : results.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {pending
              ? "Searching…"
              : handleMode
                ? `No artist with a username starting “${text}”.`
                : `Nothing found for “${query.trim()}”.`}
          </p>
        ) : (
          <ul id={listId} role="listbox" aria-label="Results">
            {results.map((result, i) => (
              <li key={result.key} role="none">
                {(i === 0 || results[i - 1]!.group !== result.group) && (
                  <p
                    aria-hidden="true"
                    className="px-3 pt-2 pb-1 font-mono text-[11px] tracking-wide text-muted-foreground uppercase"
                  >
                    {result.group}
                  </p>
                )}
                <div
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === current}
                  onPointerMove={() => setActive(i)}
                  onClick={() => choose(result)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2",
                    i === current && "bg-secondary",
                  )}
                >
                  {result.avatar ? (
                    <ProfileAvatar
                      name={result.avatar.name}
                      url={result.avatar.url}
                    />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-checker">
                      {result.thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element -- a tiny data URL
                        <img
                          src={result.thumbnail}
                          alt=""
                          className="size-full object-cover [image-rendering:pixelated]"
                        />
                      )}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {result.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {cloud.busy && result.key === `cloud:${cloud.busy}`
                        ? "Opening…"
                        : result.detail}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
