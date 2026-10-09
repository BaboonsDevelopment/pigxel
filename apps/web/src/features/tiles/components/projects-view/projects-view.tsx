"use client";

import { useEffect, useState } from "react";
import { FormMessage } from "@pigxel/ui/components/field";
import { cn } from "@pigxel/ui/lib/utils";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { pixelifySans } from "@/lib/fonts/pixelify";
import type { SavedArt } from "@/features/explore/server";
import type { Folder } from "../../folders";
import type { Label } from "../../labels";
import { listParams } from "../../queries/keys";
import { useLabels, useSetLabels } from "../../queries/labels";
import { useMoveProjects } from "../../queries/move-projects";
import { reorderFolders } from "../../actions";
import { useFolderSort } from "./drag/use-folder-sort";
import { ProjectDragProvider } from "./drag/project-drag";
import { useSeedProjectCache } from "../../queries/seed";
import { useCloudTileActions } from "../../tile-actions";
import { Favourites } from "./components/favourites";
import { FolderCard } from "./components/folder-card";
import { FolderHeader } from "./components/folder-header";
import { FolderToolbar } from "./components/folder-toolbar";
import { FolderNameDialog } from "./components/folder-name-dialog";
import {
  GRID,
  hasName,
  ProjectGrid,
} from "./components/project-grid/project-grid";
import { ProjectsHeader } from "./components/projects-header";
import { RecentRow } from "./components/recent-row";
import { SectionHeader } from "./components/section-header";
import { SharedProjects } from "./components/shared-projects";
import {
  NO_PROJECT_FILTERS,
  filtersKey,
  type Filter,
  type ProjectFilters,
  type ProjectSort,
} from "./constants";
import { viewSearch, type ProjectsViewState } from "./view";

const SEARCH_DELAY = 300;

export function ProjectsView({
  userId,
  initial,
  folders,
  folder,
  saved,
  labels: initialLabels,
  view,
  recent,
}: {
  userId: string;
  initial: { tiles: CloudTileSummary[]; count: number };
  folders: Folder[];
  folder: Folder | null;
  saved: { arts: SavedArt[]; count: number | null };
  labels: Label[];
  view: ProjectsViewState;
  recent: CloudTileSummary[] | null;
}) {
  useSeedProjectCache({
    list: {
      params: listParams(
        view.filters,
        view.query,
        folder?.id ?? null,
        false,
        false,
        view.sort,
      ),
      page: initial,
    },
    recent,
    labels: initialLabels,
    saved: { query: view.query, page: saved },
  });
  const labels = useLabels();
  const setLabels = useSetLabels();
  const [filter, setFilter] = useState<Filter>(view.filter);
  const [query, setQuery] = useState(view.query);
  const [searched, setSearched] = useState(view.query);
  const [projectFilters, setProjectFilters] = useState<ProjectFilters>(
    view.filters,
  );
  const [creating, setCreating] = useState(false);
  const [sort, setSort] = useState<ProjectSort>(view.sort);
  const folderTiles = useCloudTileActions(userId);
  const moveProjects = useMoveProjects();
  const [reorderError, setReorderError] = useState<string | null>(null);
  const folderOrder = useFolderSort(folders, (ids) => {
    setReorderError(null);
    void reorderFolders(ids).then((result) =>
      setReorderError(result.error ?? null),
    );
  });
  const sortedFolders = folderOrder.folders;
  const drop = (ids: string[], folderId: string) =>
    moveProjects.mutate({ ids, folderId });

  useEffect(() => {
    const timer = setTimeout(() => setSearched(query.trim()), SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (folder) return;
    const next = `${window.location.pathname}${viewSearch({ filter, query: searched, filters: projectFilters, sort })}`;
    if (next !== window.location.pathname + window.location.search)
      window.history.replaceState(window.history.state, "", next);
  }, [folder, filter, searched, projectFilters, sort]);

  if (folder)
    return (
      <ProjectDragProvider onDrop={drop}>
        <FolderHeader folder={folder} />
        <FolderToolbar
          query={query}
          onQueryChange={setQuery}
          sort={sort}
          onSortChange={setSort}
          filters={projectFilters}
          onFiltersChange={setProjectFilters}
          labels={labels}
        />
        <ProjectGrid
          userId={userId}
          folders={folders}
          labels={labels}
          onLabelsChange={setLabels}
          query={query}
          searched={searched}
          folderId={folder.id}
          sort={sort}
          filters={projectFilters}
        />
      </ProjectDragProvider>
    );

  const unfiltered =
    filtersKey(projectFilters) === filtersKey(NO_PROJECT_FILTERS);
  const matchingFolders = sortedFolders.filter((f) =>
    hasName(f.name, query.trim()),
  );
  const gridProps = {
    userId,
    folders,
    labels,
    onLabelsChange: setLabels,
    query,
    searched,
    sort,
  };

  return (
    <ProjectDragProvider onDrop={drop}>
      <ProjectsHeader
        filter={filter}
        onFilterChange={setFilter}
        query={query}
        onQueryChange={setQuery}
        projectFilters={projectFilters}
        onProjectFiltersChange={setProjectFilters}
        labels={labels}
        sort={sort}
        onSortChange={setSort}
      />
      {filter === "All" && !query.trim() && unfiltered && (
        <RecentRow
          userId={userId}
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
          {(folderTiles.error ?? moveProjects.error ?? reorderError) && (
            <FormMessage tone="error" className="mb-4">
              {folderTiles.error ?? moveProjects.error?.message ?? reorderError}
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
                sort={folderOrder.itemProps(f.id)}
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
        <ProjectGrid
          {...gridProps}
          filters={projectFilters}
          onViewAll={
            filter === "Projects" ? undefined : () => setFilter("Projects")
          }
        />
      )}
      {filter === "Archive" && <ProjectGrid {...gridProps} archived />}
      {filter === "Trash" && <ProjectGrid {...gridProps} trashed />}
      {filter === "Favourite" && (
        <Favourites
          userId={userId}
          query={query}
          searched={searched}
          grid={GRID}
        />
      )}
      {filter === "Shared" && (
        <SharedProjects userId={userId} query={query} grid={GRID} />
      )}
      {creating && <FolderNameDialog onClose={() => setCreating(false)} />}
    </ProjectDragProvider>
  );
}
