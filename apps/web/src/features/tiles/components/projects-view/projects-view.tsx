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
import { loadCloudTiles, moveTileToFolder } from "../../actions";
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
import { ProjectsHeader } from "./components/projects-header";
import { SectionHeader } from "./components/section-header";
import {
  NO_PROJECT_FILTERS,
  type Filter,
  type ProjectFilters,
} from "./constants";
import {
  editedAgo,
  matchesLocal,
  readLocalProjects,
  toCloudProject,
} from "./helpers";

const PRELOAD = "1500px";
const GRID =
  "grid grid-cols-2 gap-x-[33px] gap-y-[28px] sm:grid-cols-3 lg:grid-cols-5";

export function ProjectsView({
  userId,
  initial,
  folders,
  folder,
  saved,
  labels: initialLabels,
}: {
  userId: string;
  initial: CloudTileSummary[];
  folders: Folder[];
  folder: Folder | null;
  saved: SavedArt[];
  labels: Label[];
}) {
  const [labels, setLabels] = useState(initialLabels);
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [projectFilters, setProjectFilters] =
    useState<ProjectFilters>(NO_PROJECT_FILTERS);
  const [creating, setCreating] = useState(false);
  const folderTiles = useCloudTileActions(userId);

  if (folder)
    return (
      <>
        <FolderHeader folder={folder} />
        <ProjectGrid
          userId={userId}
          initial={initial}
          query=""
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
      {(filter === "All" || filter === "Folders") && (
        <section aria-labelledby="folders-heading" className="mb-[35px]">
          <SectionHeader
            id="folders-heading"
            title="Folders"
            count={String(folders.length)}
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
            {(filter === "Folders" ? folders : folders.slice(0, 4)).map((f) => (
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
          key={JSON.stringify(projectFilters)}
          filters={projectFilters}
          userId={userId}
          initial={initial}
          query={query}
          folders={folders}
          labels={labels}
          onLabelsChange={setLabels}
          onViewAll={
            filter === "Projects" ? undefined : () => setFilter("Projects")
          }
        />
      )}
      {filter === "Favourite" && (
        <Favourites saved={saved} query={query} grid={GRID} />
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
  query: string;
  folders: Folder[];
  folderId?: string;
  onViewAll?: () => void;
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
  query,
  folders,
  folderId,
  onViewAll,
  filters = NO_PROJECT_FILTERS,
  labels,
  onLabelsChange,
}: GridProps) {
  const showCloud = filters.storage === "any" || filters.storage === "cloud";
  const filtered =
    filters.size !== "any" || filters.animated || filters.label !== null;
  const narrowed = filtered || filters.storage !== "any";
  const first = !showCloud ? [] : filtered ? null : initial;
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
  const [movedOut, setMovedOut] = useState<ReadonlySet<string>>(new Set());
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
    const target = sentinel.current;
    if (done || !target) return;
    const loadMore = async () => {
      if (loading.current) return;
      loading.current = true;
      try {
        const more = await loadCloudTiles(
          offset,
          folderId ?? null,
          filters.size,
          filters.animated,
          filters.label,
        );
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
  }, [offset, done, folderId, filters.size, filters.animated, filters.label]);

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

  const projects = [
    ...(folderId || filters.storage === "cloud"
      ? []
      : local.filter((project) => matchesLocal(project, filters))),
    ...tiles
      .filter((t) => !cloud.removed.has(t.id) && !movedOut.has(t.id))
      .map(toCloudProject),
  ].sort((a, b) => b.at - a.at);
  const search = query.trim().toLowerCase();
  const shown = search
    ? projects.filter((p) => p.name.toLowerCase().includes(search))
    : projects;
  const error = cloud.error ?? moveError;

  return (
    <section aria-labelledby="projects-heading">
      <SectionHeader
        id="projects-heading"
        title="Projects"
        count={`${projects.length}${done ? "" : "+"}`}
        className="mb-3"
        onViewAll={onViewAll}
      />
      {error && (
        <FormMessage tone="error" className="mb-4">
          {error}
        </FormMessage>
      )}
      <ul className={GRID}>
        {!search && !folderId && !narrowed && <NewProjectCard />}
        {shown.map((project) => {
          const meta = `${project.width} × ${project.height} px · Edited ${editedAgo(project.at)}`;
          return project.kind === "local" ? (
            <ProjectCard
              key={project.id}
              name={project.name}
              meta={meta}
              thumbnail={<TileThumbnail image={project.image} />}
              open={{ href: editorUrl(project.id) }}
              opening={uploading === project.id}
              busyLabel="Saving to cloud…"
              menu={[
                ...(project.draft.location
                  ? []
                  : [
                      {
                        label: "Publish to Explore…",
                        onSelect: () =>
                          void publishLocal(project.draft, project.image),
                      },
                    ]),
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
              badges={labels
                .filter((label) => project.tile.labels?.includes(label.id))
                .map((label) => (
                  <span
                    key={label.id}
                    className="max-w-24 truncate rounded-full px-2 py-0.5 text-[10px] leading-tight font-medium text-[#3b2a33] shadow-sm"
                    style={{ background: label.color }}
                  >
                    {label.name}
                  </span>
                ))}
              open={{ onClick: () => void cloud.open(project.tile) }}
              opening={cloud.busy === project.id}
              disabled={cloud.busy !== null}
              menu={[
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
        (search || narrowed ? (
          <EmptyState
            title={
              search
                ? "Nothing matches your search"
                : "No projects match these filters"
            }
            description={
              search ? "Try a different name." : "Try other filters."
            }
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
