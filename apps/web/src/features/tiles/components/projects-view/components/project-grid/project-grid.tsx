"use client";

import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { useDraftsLoaded } from "@/lib/pigxel-file/use-drafts";
import { scrollParent } from "@/lib/utils/scroll-parent";
import { PixelImage } from "@/components/ui/pixel-image";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { PublishDialog } from "@/features/explore/components/explore-header/components/publish-dialog";
import { ShareDialog } from "@/features/sharing/components/share-dialog/share-dialog";
import type { Folder } from "../../../../folders";
import type { Label } from "../../../../labels";
import { listParams } from "../../../../queries/keys";
import { useProjectList } from "../../../../queries/project-list";
import {
  confirmRemoveLocalTile,
  useCloudTileActions,
} from "../../../../tile-actions";
import { ProjectCard } from "../../../project-card/project-card";
import { TileThumbnail } from "../../../tile-thumbnail";
import { TRASH_DAYS } from "../../../../constants";
import {
  NO_PROJECT_FILTERS,
  type ProjectFilters,
  type ProjectSort,
} from "../../constants";
import {
  editedAgo,
  trashDaysLeft,
  matchesLocal,
  toCloudProject,
  type Project,
} from "../../helpers";
import { DownloadDialog } from "../download-dialog";
import { StatsHover } from "../stats-hover";
import { LabelsDialog } from "../labels-dialog";
import { MoveDialog } from "../move-dialog";
import { NewProjectCard } from "../new-project-card";
import { RenameDialog } from "../rename-dialog";
import { SectionHeader } from "../section-header";
import { LabelBadge, PinBadge, PublishedBadge } from "./badges";
import { useLocalProjects } from "./use-local-projects";
import { useProjectDrag } from "../../drag/project-drag";
import { SelectionBar } from "./selection-bar";
import { useProjectActions } from "./use-project-actions";

const PRELOAD = "1500px";

export const GRID =
  "grid grid-cols-2 gap-x-[33px] gap-y-[28px] sm:grid-cols-3 lg:grid-cols-5";

const compareProjects = (a: Project, b: Project, sort: ProjectSort) =>
  sort === "az"
    ? a.name.localeCompare(b.name)
    : sort === "za"
      ? b.name.localeCompare(a.name)
      : sort === "oldest"
        ? a.at - b.at
        : b.at - a.at;

export const hasName = (name: string, query: string) =>
  !query || name.toLowerCase().includes(query.toLowerCase());

type ProjectGridProps = {
  userId: string;
  folders: Folder[];
  labels: Label[];
  onLabelsChange: (labels: Label[]) => void;
  query: string;
  searched: string;
  folderId?: string;
  archived?: boolean;
  trashed?: boolean;
  sort?: ProjectSort;
  filters?: ProjectFilters;
  onViewAll?: () => void;
};

export function ProjectGrid(props: ProjectGridProps) {
  const loaded = useDraftsLoaded(props.userId);
  if (!props.folderId && !loaded) return <div className="min-h-48" />;
  return <Grid {...props} />;
}

function Grid({
  userId,
  folders,
  labels,
  onLabelsChange,
  query,
  searched,
  folderId,
  archived = false,
  trashed = false,
  sort = "edited",
  filters = NO_PROJECT_FILTERS,
  onViewAll,
}: ProjectGridProps) {
  const showCloud = filters.storage === "any" || filters.storage === "cloud";
  const narrowed =
    filters.size !== "any" ||
    filters.animated ||
    filters.label !== null ||
    filters.published !== "any" ||
    filters.storage !== "any";

  const list = useProjectList(
    listParams(filters, searched, folderId ?? null, archived, trashed, sort),
    { enabled: showCloud },
  );
  const local = useLocalProjects(userId);
  const cloud = useCloudTileActions(userId);
  const drag = useProjectDrag();
  const actions = useProjectActions({
    userId,
    folderId: folderId ?? null,
    archived,
    local,
  });

  const [moving, setMoving] = useState<CloudTileSummary[] | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [publishing, setPublishing] = useState<CloudTileSummary | null>(null);
  const [labelling, setLabelling] = useState<CloudTileSummary | null>(null);
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [downloading, setDownloading] = useState<Project | null>(null);
  const [sharing, setSharing] = useState<CloudTileSummary | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasMore, loadMore } = list;

  useEffect(() => {
    const target = sentinel.current;
    if (!hasMore || !target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { root: scrollParent(target), rootMargin: `0px 0px ${PRELOAD} 0px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const search = query.trim();
  const settled = list.loaded && search === searched;
  const pinOf = (project: Project): number | null => {
    if (project.kind === "local") return local.pins[project.id] ?? null;
    return project.tile.pinnedAt ? Date.parse(project.tile.pinnedAt) : null;
  };

  const localShown =
    folderId || trashed || filters.storage === "cloud"
      ? []
      : local.projects.filter(
          (project) =>
            Boolean(local.archived[project.id]) === archived &&
            matchesLocal(project, filters) &&
            hasName(project.name, search),
        );
  const cloudShown = list.tiles.filter(
    (tile) =>
      !cloud.removed.has(tile.id) && (settled || hasName(tile.name, search)),
  );
  const total =
    localShown.length +
    Math.max(
      0,
      list.count -
        list.tiles.filter((tile) => cloud.removed.has(tile.id)).length,
    );
  const projects = [...localShown, ...cloudShown.map(toCloudProject)].sort(
    (a, b) =>
      (pinOf(b) ?? -1) - (pinOf(a) ?? -1) || compareProjects(a, b, sort),
  );
  const error = cloud.error ?? actions.error;

  const chosen = projects.filter((project) => selected.has(project.id));
  const chosenTiles = chosen.flatMap((project) =>
    project.kind === "cloud" ? [project.tile] : [],
  );
  const unpublished = chosenTiles.filter((tile) => !tile.published);
  const toggle = (id: string) =>
    setSelected((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };
  const publishChosen = async () => {
    const confirmed = await confirmDialog({
      title: `Publish ${unpublished.length === 1 ? "1 project" : `${unpublished.length} projects`} to Explore?`,
      message:
        "Each one is checked for adult content first. You can add tags and a description later with “Edit Explore details…”.",
      confirmLabel: "Publish",
    });
    if (!confirmed) return;
    await actions.publishMany(unpublished).then(stopSelecting, () => {});
  };
  const deleteChosen = async () => {
    const local = chosen.length - chosenTiles.length;
    const confirmed = await confirmDialog({
      title: `Delete ${chosen.length === 1 ? "1 project" : `${chosen.length} projects`}?`,
      message: [
        chosenTiles.length > 0 &&
          `${chosenTiles.length} from Pigxel cloud will move to Trash for ${TRASH_DAYS} days.`,
        local > 0 &&
          `${local} kept in this browser will be removed from it. Projects only in this browser are gone for good.`,
      ]
        .filter(Boolean)
        .join(" "),
      confirmLabel: "Delete",
    });
    if (!confirmed) return;
    await actions.deleteMany(chosen).then(stopSelecting, () => {});
  };

  const forget = async (tile: CloudTileSummary) => {
    const confirmed = await confirmDialog({
      title: "Delete forever?",
      message: `“${tile.name}” will be gone for good. This can’t be undone.`,
      confirmLabel: "Delete forever",
    });
    if (confirmed) actions.deleteForever([tile]);
  };
  const emptyTrash = async () => {
    const confirmed = await confirmDialog({
      title: "Empty Trash?",
      message:
        "Every project in Trash will be gone for good. This can’t be undone.",
      confirmLabel: "Empty Trash",
    });
    if (confirmed) actions.deleteForever(list.tiles, true);
  };

  const moveLocal = async (project: Extract<Project, { kind: "local" }>) => {
    const confirmed = await confirmDialog({
      title: "Save to Pigxel cloud first?",
      message: `Folders hold cloud projects, so “${project.name}” will be saved to Pigxel cloud and then moved.`,
      confirmLabel: "Save and move",
    });
    if (!confirmed) return;
    const tile = await actions
      .upload(project.draft, project.image)
      .catch(() => null);
    if (tile) setMoving([tile]);
  };

  const shareLocal = async (project: Extract<Project, { kind: "local" }>) => {
    const confirmed = await confirmDialog({
      title: "Save to Pigxel cloud first?",
      message: `Only cloud projects can be shared, so “${project.name}” will be saved to Pigxel cloud first.`,
      confirmLabel: "Save and share",
    });
    if (!confirmed) return;
    const tile = await actions
      .upload(project.draft, project.image)
      .catch(() => null);
    if (tile) setSharing(tile);
  };

  const commonItems = (project: Project) => [
    {
      label: pinOf(project) === null ? "Pin to top" : "Unpin",
      onSelect: () => actions.togglePin(project, pinOf(project) === null),
    },
    { label: "Rename…", onSelect: () => setRenaming(project) },
    { label: "Duplicate", onSelect: () => actions.duplicate(project) },
    { label: "Download…", onSelect: () => setDownloading(project) },
  ];
  const archiveItem = (project: Project) => ({
    label: archived ? "Restore" : "Archive",
    onSelect: () => actions.toggleArchive(project),
  });

  return (
    <section aria-labelledby="projects-heading">
      <SectionHeader
        id="projects-heading"
        title={trashed ? "Trash" : archived ? "Archive" : "Projects"}
        count={String(total)}
        className="mb-3"
        onViewAll={onViewAll}
        action={
          trashed
            ? projects.length > 0 && (
                <button
                  type="button"
                  onClick={() => void emptyTrash()}
                  className="mr-4 ml-auto cursor-pointer text-xs text-destructive transition-colors hover:underline"
                >
                  Empty Trash
                </button>
              )
            : projects.length > 0 && (
                <button
                  type="button"
                  aria-pressed={selecting}
                  onClick={() =>
                    selecting ? stopSelecting() : setSelecting(true)
                  }
                  className="ml-auto mr-4 cursor-pointer text-xs text-link-accent transition-colors hover:text-lavender-foreground"
                >
                  {selecting ? "Done" : "Select"}
                </button>
              )
        }
      />
      {error && (
        <FormMessage tone="error" className="mb-4">
          {error}
        </FormMessage>
      )}
      <ul className={GRID}>
        {!search && !narrowed && !archived && !trashed && (
          <NewProjectCard folderId={folderId} />
        )}
        {projects.map((project) => {
          const meta = `${project.width} × ${project.height} px · Edited ${editedAgo(project.at)}`;
          if (project.kind === "local")
            return (
              <ProjectCard
                key={project.id}
                name={project.name}
                meta={meta}
                thumbnail={<TileThumbnail image={project.image} />}
                badges={pinOf(project) !== null && <PinBadge />}
                open={
                  selecting
                    ? { onClick: () => toggle(project.id) }
                    : { href: editorUrl(project.id) }
                }
                selected={selecting ? selected.has(project.id) : undefined}
                opening={actions.uploading === project.id}
                busyLabel="Saving to cloud…"
                menu={[
                  ...commonItems(project),
                  ...(project.draft.location
                    ? []
                    : [
                        {
                          label: "Save to cloud",
                          onSelect: () =>
                            void actions
                              .upload(project.draft, project.image)
                              .catch(() => {}),
                        },
                        {
                          label: "Publish to Explore…",
                          onSelect: () =>
                            void actions
                              .upload(project.draft, project.image)
                              .then(setPublishing, () => {}),
                        },
                        {
                          label: "Move to folder…",
                          onSelect: () => void moveLocal(project),
                        },
                        {
                          label: "Share…",
                          onSelect: () => void shareLocal(project),
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
                        local.refresh();
                    },
                  },
                ]}
              />
            );
          const { tile } = project;
          if (trashed && tile.deletedAt)
            return (
              <ProjectCard
                key={project.id}
                name={project.name}
                meta={`${trashDaysLeft(tile.deletedAt)} days left · Deleted ${editedAgo(Date.parse(tile.deletedAt))}`}
                thumbnail={
                  tile.thumbnail && <PixelImage src={tile.thumbnail} alt="" />
                }
                openLabel="Restore"
                open={{ onClick: () => actions.restore([tile]) }}
                menu={[
                  { label: "Restore", onSelect: () => actions.restore([tile]) },
                  {
                    label: "Delete forever",
                    destructive: true,
                    onSelect: () => void forget(tile),
                  },
                ]}
              />
            );
          return (
            <ProjectCard
              key={project.id}
              name={project.name}
              meta={meta}
              thumbnail={
                tile.thumbnail && <PixelImage src={tile.thumbnail} alt="" />
              }
              badges={[
                pinOf(project) !== null && <PinBadge key="pinned" />,
                tile.published && <PublishedBadge key="published" />,
                ...labels
                  .filter((label) => tile.labels?.includes(label.id))
                  .map((label) => <LabelBadge key={label.id} label={label} />),
              ]}
              open={{
                onClick: () =>
                  selecting ? toggle(project.id) : void cloud.open(tile),
              }}
              selected={selecting ? selected.has(project.id) : undefined}
              onPointerDown={(event) => {
                const group =
                  selecting && selected.has(project.id) ? chosenTiles : [tile];
                drag.start(event, {
                  ids: group.map((t) => t.id),
                  name:
                    group.length > 1 ? `${group.length} projects` : tile.name,
                  thumbnail: tile.thumbnail,
                });
              }}
              dragging={drag.isDragging(project.id)}
              corner={tile.published && <StatsHover tile={tile} />}
              opening={
                cloud.busy === project.id || actions.duplicating === project.id
              }
              busyLabel={
                actions.duplicating === project.id ? "Duplicating…" : undefined
              }
              disabled={cloud.busy !== null}
              menu={[
                ...commonItems(project),
                {
                  label: tile.published
                    ? "Edit Explore details…"
                    : "Publish to Explore…",
                  onSelect: () => setPublishing(tile),
                },
                { label: "Move to folder…", onSelect: () => setMoving([tile]) },
                { label: "Share…", onSelect: () => setSharing(tile) },
                { label: "Labels…", onSelect: () => setLabelling(tile) },
                ...(folderId
                  ? [
                      {
                        label: "Remove from folder",
                        onSelect: () => actions.removeFromFolder(tile),
                      },
                    ]
                  : []),
                archiveItem(project),
                {
                  label: "Delete",
                  destructive: true,
                  onSelect: async () => {
                    await cloud.remove(tile);
                    actions.deleted();
                  },
                },
              ]}
            />
          );
        })}
      </ul>
      {!projects.length &&
        !list.hasMore &&
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
        ) : trashed ? (
          <EmptyState
            title="Trash is empty"
            description={`Deleted cloud projects stay here for ${TRASH_DAYS} days, so you can restore them.`}
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
      {list.hasMore && (
        <div ref={sentinel} aria-hidden="true" className="h-px" />
      )}
      {publishing && (
        <PublishDialog
          tile={publishing}
          onPublished={() => actions.published(publishing, true)}
          onUnpublished={() => actions.published(publishing, false)}
          onClose={() => setPublishing(null)}
        />
      )}
      {labelling && (
        <LabelsDialog
          tile={labelling}
          labels={labels}
          onLabelsChange={onLabelsChange}
          onSaved={(ids) => actions.labelled(labelling, ids)}
          onClose={() => setLabelling(null)}
        />
      )}
      {downloading && (
        <DownloadDialog
          name={downloading.name}
          {...(downloading.kind === "local"
            ? { file: downloading.draft.file }
            : { tileId: downloading.id })}
          onClose={() => setDownloading(null)}
        />
      )}
      {sharing && (
        <ShareDialog tile={sharing} onClose={() => setSharing(null)} />
      )}
      {renaming && (
        <RenameDialog
          name={renaming.name}
          onRename={(name) => actions.rename(renaming, name)}
          onClose={() => setRenaming(null)}
        />
      )}
      {selecting && (
        <SelectionBar
          count={chosen.length}
          busy={actions.batchBusy}
          canMove={chosenTiles.length > 0}
          canPublish={unpublished.length > 0}
          onMove={() => setMoving(chosenTiles)}
          onPublish={() => void publishChosen()}
          onDelete={() => void deleteChosen()}
          onSelectAll={() =>
            setSelected(new Set(projects.map((project) => project.id)))
          }
          onCancel={stopSelecting}
        />
      )}
      {moving && (
        <MoveDialog
          tiles={moving}
          folders={folders}
          currentFolderId={folderId}
          onMoved={(to) => {
            actions.moved(moving, to);
            if (selecting) stopSelecting();
          }}
          onClose={() => setMoving(null)}
        />
      )}
    </section>
  );
}
