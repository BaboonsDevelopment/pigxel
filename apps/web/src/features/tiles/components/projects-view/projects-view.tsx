"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { cn } from "@pigxel/ui/lib/utils";
import {
  CloudError,
  saveCloudTile,
  type CloudTileSummary,
} from "@/lib/pigxel-file/cloud";
import { writeDraft, type Draft } from "@/lib/pigxel-file/draft";
import type { PigxelDocument } from "@/lib/pigxel-file/format";
import { thumbnailDataUrl } from "@/lib/pigxel-file/thumbnail";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { useDraftsLoaded } from "@/lib/pigxel-file/use-drafts";
import { scrollParent } from "@/lib/utils/scroll-parent";
import { PixelImage } from "@/components/ui/pixel-image";
import { pixelifySans } from "@/lib/fonts/pixelify";
import {
  loadCloudTiles,
  loadCloudTilesCounted,
  moveTileToFolder,
  setProjectArchived,
  setProjectPinned,
} from "../../actions";
import { readMarks, writeMark } from "../../local-marks";
import { PAGE_SIZE } from "../../constants";
import type { Folder } from "../../folders";
import type { Label } from "../../labels";
import {
  confirmRemoveLocalTile,
  useCloudTileActions,
} from "../../tile-actions";
import { ProjectCard } from "../project-card/project-card";
import { TileThumbnail } from "../tile-thumbnail";
import type { SavedArt } from "@/features/explore/server";
import { PublishDialog } from "@/features/explore/components/explore-header/components/publish-dialog";
import { Favourites } from "./components/favourites";
import { FolderCard } from "./components/folder-card";
import { FolderHeader } from "./components/folder-header";
import { FolderNameDialog } from "./components/folder-name-dialog";
import { LabelsDialog } from "./components/labels-dialog";
import { MoveDialog } from "./components/move-dialog";
import { NewProjectCard } from "./components/new-project-card";
import { RecentRow } from "./components/recent-row";
import { ProjectsHeader } from "./components/projects-header";
import { SectionHeader } from "./components/section-header";
import {
  NO_PROJECT_FILTERS,
  filtersKey,
  queryOfKey,
  type Filter,
  type ProjectFilters,
} from "./constants";
import {
  editedAgo,
  matchesLocal,
  readLocalProjects,
  toCloudProject,
  type Project,
} from "./helpers";
import { viewSearch, type ProjectsViewState } from "./view";

const PRELOAD = "1500px";
const SEARCH_DELAY = 300;

const hasName = (name: string, query: string) =>
  !query || name.toLowerCase().includes(query.toLowerCase());

const PIN_BADGE = (
  <span
    key="pinned"
    aria-label="Pinned"
    className="flex size-6 items-center justify-center rounded-md border border-black/5 bg-white/95 text-primary shadow-sm"
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 9 9"
      shapeRendering="crispEdges"
      className="size-4"
    >
      <path d="M2 0h5v2H6v2h2v1H5v4H4V5H1V4h2V2H2Z" fill="currentColor" />
      <path d="M3 0h1v2H3Z" fill="#fff" fillOpacity=".55" />
    </svg>
  </span>
);
const PUBLISHED_BADGE = (
  <span
    key="published"
    className={cn(
      pixelifySans.className,
      "flex h-6 items-center gap-1 rounded-md border border-primary/20 bg-primary px-2 text-xs text-primary-foreground shadow-sm",
    )}
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 7 7"
      shapeRendering="crispEdges"
      className="size-2.5"
    >
      <path
        d="M2 0h3v1h1v1h1v3H6v1H5v1H2V6H1V5H0V2h1V1h1Z"
        fill="currentColor"
      />
    </svg>
    Published
  </span>
);

const GRID =
  "grid grid-cols-2 gap-x-[33px] gap-y-[28px] sm:grid-cols-3 lg:grid-cols-5";

export function ProjectsView({
  userId,
  initial,
  initialCount,
  folders,
  folder,
  saved,
  labels: initialLabels,
  view,
  recent,
}: {
  userId: string;
  initial: CloudTileSummary[];
  initialCount: number;
  folders: Folder[];
  folder: Folder | null;
  saved: SavedArt[];
  labels: Label[];
  view: ProjectsViewState;
  recent: CloudTileSummary[];
}) {
  const [labels, setLabels] = useState(initialLabels);
  const [filter, setFilter] = useState<Filter>(view.filter);
  const [query, setQuery] = useState(view.query);
  const [searched, setSearched] = useState(view.query);
  const [projectFilters, setProjectFilters] = useState<ProjectFilters>(
    view.filters,
  );
  const [initialKey] = useState(() => filtersKey(view.filters, view.query));

  useEffect(() => {
    const timer = setTimeout(() => setSearched(query.trim()), SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (folder) return;
    const next = `${window.location.pathname}${viewSearch({ filter, query: searched, filters: projectFilters })}`;
    if (next !== window.location.pathname + window.location.search)
      window.history.replaceState(window.history.state, "", next);
  }, [folder, filter, searched, projectFilters]);

  const matchingFolders = folders.filter((f) => hasName(f.name, query.trim()));
  const [creating, setCreating] = useState(false);
  const folderTiles = useCloudTileActions(userId);

  if (folder)
    return (
      <>
        <FolderHeader folder={folder} />
        <ProjectGrid
          userId={userId}
          initial={initial}
          initialCount={initialCount}
          query=""
          initialKey={filtersKey(NO_PROJECT_FILTERS)}
          searched=""
          folders={folders}
          folderId={folder.id}
          labels={labels}
          onLabelsChange={setLabels}
        />
      </>
    );

  return (
    <>
      <ProjectsHeader
        filter={filter}
        onFilterChange={setFilter}
        query={query}
        onQueryChange={setQuery}
        projectFilters={projectFilters}
        onProjectFiltersChange={setProjectFilters}
        labels={labels}
      />
      {filter === "All" &&
        !query.trim() &&
        filtersKey(projectFilters) === filtersKey(NO_PROJECT_FILTERS) && (
          <RecentRow
            userId={userId}
            cloud={recent}
            busy={folderTiles.busy}
            onOpen={(tile) => void folderTiles.open(tile)}
          />
        )}
      {(filter === "All" || filter === "Folders") && (
        <section aria-labelledby="folders-heading" className="mb-[35px]">
          <SectionHeader
            id="folders-heading"
            title="Folders"
            count={String(matchingFolders.length)}
            className="mb-[27px]"
            onViewAll={
              filter === "Folders" ? undefined : () => setFilter("Folders")
            }
          />
          {folderTiles.error && (
            <FormMessage tone="error" className="mb-4">
              {folderTiles.error}
            </FormMessage>
          )}
          <ul className={GRID}>
            <li>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className={cn(
                  pixelifySans.className,
                  "flex h-full min-h-[100px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-input bg-background/70 text-sm text-foreground transition-colors hover:border-primary-soft hover:bg-pastel-pink-soft focus-visible:bg-pastel-pink-soft",
                )}
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
                  <path
                    d="M8 2v12M2 8h12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                New folder
              </button>
            </li>
            {(filter === "Folders"
              ? matchingFolders
              : matchingFolders.slice(0, 4)
            ).map((f) => (
              <FolderCard
                key={f.id}
                folder={f}
                opening={folderTiles.busy}
                onOpen={(project) =>
                  void folderTiles.open({
                    id: project.id,
                    name: project.name,
                    width: project.width,
                    height: project.height,
                    thumbnail: project.thumbnail,
                    updatedAt: new Date(project.at).toISOString(),
                  })
                }
              />
            ))}
          </ul>
        </section>
      )}
      {(filter === "All" || filter === "Projects") && (
        <Projects
          key={filtersKey(projectFilters)}
          filters={projectFilters}
          userId={userId}
          initial={initial}
          initialCount={initialCount}
          initialKey={initialKey}
          query={query}
          searched={searched}
          folders={folders}
          labels={labels}
          onLabelsChange={setLabels}
          onViewAll={
            filter === "Projects" ? undefined : () => setFilter("Projects")
          }
        />
      )}
      {filter === "Archive" && (
        <Projects
          key="archive"
          archived
          userId={userId}
          initial={[]}
          initialCount={0}
          initialKey=""
          query={query}
          searched={searched}
          folders={folders}
          labels={labels}
          onLabelsChange={setLabels}
        />
      )}
      {filter === "Favourite" && (
        <Favourites
          saved={saved}
          savedFor={view.query}
          query={query}
          searched={searched}
          grid={GRID}
        />
      )}
      {filter === "Shared" && (
        <EmptyState
          title="Nothing here yet"
          description="This section is coming soon."
        />
      )}
      {creating && <FolderNameDialog onClose={() => setCreating(false)} />}
    </>
  );
}

type GridProps = {
  userId: string;
  initial: CloudTileSummary[];
  initialCount: number;
  initialKey: string;
  query: string;
  searched: string;
  folders: Folder[];
  folderId?: string;
  onViewAll?: () => void;
  archived?: boolean;
  filters?: ProjectFilters;
  labels: Label[];
  onLabelsChange: (labels: Label[]) => void;
};

function Projects(props: GridProps) {
  if (!useDraftsLoaded(props.userId)) return <div className="min-h-48" />;
  return <ProjectGrid {...props} />;
}

function ProjectGrid({
  userId,
  initial,
  initialCount,
  initialKey,
  query,
  searched,
  folders,
  folderId,
  onViewAll,
  archived = false,
  filters = NO_PROJECT_FILTERS,
  labels,
  onLabelsChange,
}: GridProps) {
  const showCloud = filters.storage === "any" || filters.storage === "cloud";
  const narrowed =
    filters.size !== "any" ||
    filters.animated ||
    filters.label !== null ||
    filters.published !== "any" ||
    filters.storage !== "any";
  const key = filtersKey(filters, searched);
  const first = !showCloud ? [] : key === initialKey ? initial : null;
  const [loadedKey, setLoadedKey] = useState(first ? key : null);
  const cloud = useCloudTileActions(userId);
  const [local, refreshLocal] = useReducer(
    () => readLocalProjects(userId),
    userId,
    readLocalProjects,
  );
  const [tiles, setTiles] = useState(first ?? []);
  const [offset, setOffset] = useState(first?.length ?? 0);
  const [done, setDone] = useState(
    first !== null && (!showCloud || first.length < PAGE_SIZE),
  );
  const [moving, setMoving] = useState<CloudTileSummary | null>(null);
  const [publishing, setPublishing] = useState<CloudTileSummary | null>(null);
  const [labelling, setLabelling] = useState<CloudTileSummary | null>(null);
  const [localArchived, setLocalArchived] = useState(() =>
    readMarks(userId, "archived"),
  );
  const [localPins, setLocalPins] = useState(() => readMarks(userId, "pinned"));
  const [cloudPins, setCloudPins] = useState<
    ReadonlyMap<string, number | null>
  >(new Map());
  const pinOf = (project: Project): number | null => {
    if (project.kind === "local") return localPins[project.id] ?? null;
    if (cloudPins.has(project.id)) return cloudPins.get(project.id) ?? null;
    return project.tile.pinnedAt ? Date.parse(project.tile.pinnedAt) : null;
  };
  const togglePin = async (project: Project) => {
    const pin = pinOf(project) === null;
    if (project.kind === "local") {
      writeMark(userId, "pinned", project.id, pin);
      setLocalPins(readMarks(userId, "pinned"));
      return;
    }
    setMoveError(null);
    setCloudPins((pins) =>
      new Map(pins).set(project.id, pin ? Number.MAX_SAFE_INTEGER : null),
    );
    const result = await setProjectPinned(project.id, pin);
    if (!result.error) return;
    setMoveError(result.error);
    setCloudPins((pins) => {
      const next = new Map(pins);
      next.delete(project.id);
      return next;
    });
  };
  const toggleArchive = async (project: Project) => {
    if (project.kind === "local") {
      writeMark(userId, "archived", project.id, !archived);
      setLocalArchived(readMarks(userId, "archived"));
      return;
    }
    setMoveError(null);
    setMovedOut((ids) => new Set(ids).add(project.id));
    const result = await setProjectArchived(project.id, !archived);
    if (!result.error) return;
    setMoveError(result.error);
    setMovedOut((ids) => {
      const next = new Set(ids);
      next.delete(project.id);
      return next;
    });
  };
  const archiveItem = (project: Project) => ({
    label: archived ? "Restore" : "Archive",
    onSelect: () => void toggleArchive(project),
  });
  const pinItem = (project: Project) => ({
    label: pinOf(project) === null ? "Pin to top" : "Unpin",
    onSelect: () => void togglePin(project),
  });
  const [movedOut, setMovedOut] = useState<ReadonlySet<string>>(new Set());
  const [cloudCount, setCloudCount] = useState(
    showCloud && first ? initialCount : 0,
  );
  const [countedAt, setCountedAt] = useState({ removed: 0, moved: 0 });
  const [moveError, setMoveError] = useState<string | null>(null);
  const [published, setPublished] = useState<ReadonlyMap<string, boolean>>(
    new Map(),
  );
  const markPublished = (tileId: string, value: boolean) =>
    setPublished((map) => new Map(map).set(tileId, value));
  const [uploading, setUploading] = useState<string | null>(null);
  const publishLocal = async (draft: Draft, image: PigxelDocument) => {
    setMoveError(null);
    setUploading(draft.id);
    try {
      const tile = await saveCloudTile(
        { name: draft.name },
        draft.file,
        image,
        thumbnailDataUrl(image),
      );
      writeDraft(userId, {
        id: draft.id,
        name: draft.name,
        file: draft.file,
        location: { kind: "cloud", tile },
        dirty: false,
      });
      const summary: CloudTileSummary = {
        id: tile.id,
        name: tile.name,
        width: image.width,
        height: image.height,
        thumbnail: thumbnailDataUrl(image),
        updatedAt: new Date().toISOString(),
        published: false,
      };
      setTiles((all) => [summary, ...all]);
      setCloudCount((count) => count + 1);
      refreshLocal();
      setPublishing(summary);
    } catch (e) {
      setMoveError(
        e instanceof CloudError
          ? e.message
          : "Couldn’t save to Pigxel cloud. Try again.",
      );
    } finally {
      setUploading(null);
    }
  };
  const loading = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (key === loadedKey) return;
    let stale = false;
    void (
      showCloud
        ? loadCloudTilesCounted(folderId ?? null, {
            ...queryOfKey(key),
            archived,
          })
        : Promise.resolve({ tiles: [], count: 0 })
    ).then(({ tiles: page, count }) => {
      if (stale) return;
      setTiles(page);
      setOffset(page.length);
      setDone(page.length < PAGE_SIZE);
      setCloudCount(count);
      setCountedAt({ removed: cloud.removed.size, moved: movedOut.size });
      setLoadedKey(key);
    });
    return () => {
      stale = true;
    };
  }, [
    key,
    loadedKey,
    showCloud,
    folderId,
    archived,
    cloud.removed.size,
    movedOut.size,
  ]);

  useEffect(() => {
    const target = sentinel.current;
    if (done || !target || key !== loadedKey) return;
    const loadMore = async () => {
      if (loading.current) return;
      loading.current = true;
      try {
        const more = await loadCloudTiles(offset, folderId ?? null, {
          ...queryOfKey(key),
          archived,
        });
        if (more.length < PAGE_SIZE) setDone(true);
        setOffset(offset + more.length);
        setTiles((all) => {
          const shown = new Set(all.map((t) => t.id));
          return [...all, ...more.filter((t) => !shown.has(t.id))];
        });
      } finally {
        loading.current = false;
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMore();
      },
      { root: scrollParent(target), rootMargin: `0px 0px ${PRELOAD} 0px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [offset, done, folderId, archived, key, loadedKey]);

  const markMoved = (tileId: string, to: string | null) => {
    if (folderId && to !== folderId)
      setMovedOut((ids) => new Set(ids).add(tileId));
  };

  const removeFromFolder = async (tile: CloudTileSummary) => {
    setMoveError(null);
    const result = await moveTileToFolder(tile.id, null);
    if (result.error) setMoveError(result.error);
    else markMoved(tile.id, null);
  };

  const search = query.trim();
  const settled = key === loadedKey && search === searched;
  const localShown =
    folderId || filters.storage === "cloud"
      ? []
      : local.filter(
          (project) =>
            Boolean(localArchived[project.id]) === archived &&
            matchesLocal(project, filters) &&
            hasName(project.name, search),
        );
  const total =
    localShown.length +
    Math.max(
      0,
      cloudCount -
        (cloud.removed.size - countedAt.removed) -
        (movedOut.size - countedAt.moved),
    );
  const projects = [
    ...localShown,
    ...tiles
      .filter(
        (t) =>
          !cloud.removed.has(t.id) &&
          !movedOut.has(t.id) &&
          (settled || hasName(t.name, search)),
      )
      .map(toCloudProject),
  ].sort((a, b) => (pinOf(b) ?? -1) - (pinOf(a) ?? -1) || b.at - a.at);
  const shown = projects;
  const error = cloud.error ?? moveError;

  return (
    <section aria-labelledby="projects-heading">
      <SectionHeader
        id="projects-heading"
        title={archived ? "Archive" : "Projects"}
        count={String(total)}
        className="mb-3"
        onViewAll={onViewAll}
      />
      {error && (
        <FormMessage tone="error" className="mb-4">
          {error}
        </FormMessage>
      )}
      <ul className={GRID}>
        {!search && !folderId && !narrowed && !archived && <NewProjectCard />}
        {shown.map((project) => {
          const meta = `${project.width} × ${project.height} px · Edited ${editedAgo(project.at)}`;
          return project.kind === "local" ? (
            <ProjectCard
              key={project.id}
              name={project.name}
              meta={meta}
              thumbnail={<TileThumbnail image={project.image} />}
              badges={pinOf(project) !== null && PIN_BADGE}
              open={{ href: editorUrl(project.id) }}
              opening={uploading === project.id}
              busyLabel="Saving to cloud…"
              menu={[
                pinItem(project),
                ...(project.draft.location
                  ? []
                  : [
                      {
                        label: "Publish to Explore…",
                        onSelect: () =>
                          void publishLocal(project.draft, project.image),
                      },
                    ]),
                archiveItem(project),
                {
                  label:
                    project.draft.location?.kind === "drive"
                      ? "Remove from this browser"
                      : "Delete",
                  destructive: true,
                  onSelect: async () => {
                    if (await confirmRemoveLocalTile(userId, project.draft))
                      refreshLocal();
                  },
                },
              ]}
            />
          ) : (
            <ProjectCard
              key={project.id}
              name={project.name}
              meta={meta}
              thumbnail={
                project.tile.thumbnail && (
                  <PixelImage src={project.tile.thumbnail} alt="" />
                )
              }
              badges={[
                ...(pinOf(project) !== null ? [PIN_BADGE] : []),
                ...((published.get(project.id) ?? project.tile.published)
                  ? [PUBLISHED_BADGE]
                  : []),
                ...labels
                  .filter((label) => project.tile.labels?.includes(label.id))
                  .map((label) => (
                    <span
                      key={label.id}
                      className={cn(
                        pixelifySans.className,
                        "flex h-6 max-w-28 items-center truncate rounded-md border border-black/5 px-2 text-xs text-[#3b2a33] shadow-sm",
                      )}
                      style={{ background: label.color }}
                    >
                      {label.name}
                    </span>
                  )),
              ]}
              open={{ onClick: () => void cloud.open(project.tile) }}
              opening={cloud.busy === project.id}
              disabled={cloud.busy !== null}
              menu={[
                pinItem(project),
                ...((published.get(project.id) ?? project.tile.published)
                  ? [
                      {
                        label: "Edit Explore details…",
                        onSelect: () => setPublishing(project.tile),
                      },
                    ]
                  : [
                      {
                        label: "Publish to Explore…",
                        onSelect: () => setPublishing(project.tile),
                      },
                    ]),
                {
                  label: "Move to folder…",
                  onSelect: () => setMoving(project.tile),
                },
                {
                  label: "Labels…",
                  onSelect: () => setLabelling(project.tile),
                },
                ...(folderId
                  ? [
                      {
                        label: "Remove from folder",
                        onSelect: () => void removeFromFolder(project.tile),
                      },
                    ]
                  : []),
                archiveItem(project),
                {
                  label: "Delete",
                  destructive: true,
                  onSelect: () => void cloud.remove(project.tile),
                },
              ]}
            />
          );
        })}
      </ul>
      {!shown.length &&
        done &&
        settled &&
        (search || narrowed ? (
          <EmptyState
            title={
              search
                ? "Nothing matches your search"
                : "No projects match these filters"
            }
            description={
              search
                ? "Try a different name, description or tag."
                : "Try other filters."
            }
          />
        ) : archived ? (
          <EmptyState
            title="Nothing archived"
            description="Archive a project from its ⋯ menu to tuck it away here. You can restore it any time."
          />
        ) : (
          folderId && (
            <EmptyState
              title="This folder is empty"
              description="Use “Move to folder…” on a project to add it here."
            />
          )
        ))}
      {!done && <div ref={sentinel} aria-hidden="true" className="h-px" />}
      {publishing && (
        <PublishDialog
          tile={publishing}
          onPublished={() => markPublished(publishing.id, true)}
          onUnpublished={() => markPublished(publishing.id, false)}
          onClose={() => setPublishing(null)}
        />
      )}
      {labelling && (
        <LabelsDialog
          tile={labelling}
          labels={labels}
          onLabelsChange={onLabelsChange}
          onSaved={(ids) =>
            setTiles((all) =>
              all.map((t) =>
                t.id === labelling.id ? { ...t, labels: ids } : t,
              ),
            )
          }
          onClose={() => setLabelling(null)}
        />
      )}
      {moving && (
        <MoveDialog
          tile={moving}
          folders={folders}
          currentFolderId={folderId}
          onMoved={(to) => markMoved(moving.id, to)}
          onClose={() => setMoving(null)}
        />
      )}
    </section>
  );
}
