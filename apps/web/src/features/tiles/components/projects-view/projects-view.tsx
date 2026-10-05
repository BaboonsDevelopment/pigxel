"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { useDraftsLoaded } from "@/lib/pigxel-file/use-drafts";
import { scrollParent } from "@/lib/utils/scroll-parent";
import { PixelImage } from "@/components/ui/pixel-image";
import { loadCloudTiles } from "../../actions";
import { PAGE_SIZE } from "../../constants";
import {
  confirmRemoveLocalTile,
  useCloudTileActions,
} from "../../tile-actions";
import { ProjectCard } from "../project-card/project-card";
import { TileThumbnail } from "../tile-thumbnail";
import { FolderCard } from "./components/folder-card";
import { NewProjectCard } from "./components/new-project-card";
import { ProjectsHeader } from "./components/projects-header";
import { SectionHeader } from "./components/section-header";
import type { Filter, Folder } from "./constants";
import { editedAgo, readLocalProjects, toCloudProject } from "./helpers";

const PRELOAD = "1500px";
const GRID =
  "grid grid-cols-2 gap-x-[33px] gap-y-[28px] sm:grid-cols-3 lg:grid-cols-5";
const FOLDERS: Folder[] = [];

export function ProjectsView({
  userId,
  initial,
}: {
  userId: string;
  initial: CloudTileSummary[];
}) {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  return (
    <>
      <ProjectsHeader
        filter={filter}
        onFilterChange={setFilter}
        query={query}
        onQueryChange={setQuery}
      />
      {(filter === "All" || filter === "Folders") && (
        <section aria-labelledby="folders-heading" className="mb-[35px]">
          <SectionHeader
            id="folders-heading"
            title="Folders"
            count={String(FOLDERS.length)}
            className="mb-[27px]"
            onViewAll={
              filter === "Folders" ? undefined : () => setFilter("Folders")
            }
          />
          {FOLDERS.length ? (
            <ul className={GRID}>
              {FOLDERS.map((folder) => (
                <FolderCard key={folder.id} folder={folder} />
              ))}
            </ul>
          ) : (
            <p className="flex h-[102px] items-center justify-center rounded-2xl border-2 border-dashed border-input bg-background/60 text-sm text-muted-foreground">
              No folders yet
            </p>
          )}
        </section>
      )}
      {(filter === "All" || filter === "Projects") && (
        <Projects
          userId={userId}
          initial={initial}
          query={query}
          onViewAll={
            filter === "Projects" ? undefined : () => setFilter("Projects")
          }
        />
      )}
      {(filter === "Shared" || filter === "Favourite") && (
        <EmptyState
          title="Nothing here yet"
          description="This section is coming soon."
        />
      )}
    </>
  );
}

function Projects(props: {
  userId: string;
  initial: CloudTileSummary[];
  query: string;
  onViewAll?: () => void;
}) {
  if (!useDraftsLoaded(props.userId)) return <div className="min-h-48" />;
  return <ProjectGrid {...props} />;
}

function ProjectGrid({
  userId,
  initial,
  query,
  onViewAll,
}: {
  userId: string;
  initial: CloudTileSummary[];
  query: string;
  onViewAll?: () => void;
}) {
  const cloud = useCloudTileActions(userId);
  const [local, refreshLocal] = useReducer(
    () => readLocalProjects(userId),
    userId,
    readLocalProjects,
  );
  const [tiles, setTiles] = useState(initial);
  const [offset, setOffset] = useState(initial.length);
  const [done, setDone] = useState(initial.length < PAGE_SIZE);
  const loading = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = sentinel.current;
    if (done || !target) return;
    const loadMore = async () => {
      if (loading.current) return;
      loading.current = true;
      try {
        const more = await loadCloudTiles(offset);
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
  }, [offset, done]);

  const projects = [
    ...local,
    ...tiles.filter((t) => !cloud.removed.has(t.id)).map(toCloudProject),
  ].sort((a, b) => b.at - a.at);
  const search = query.trim().toLowerCase();
  const shown = search
    ? projects.filter((p) => p.name.toLowerCase().includes(search))
    : projects;

  return (
    <section aria-labelledby="projects-heading">
      <SectionHeader
        id="projects-heading"
        title="Projects"
        count={`${projects.length}${done ? "" : "+"}`}
        className="mb-3"
        onViewAll={onViewAll}
      />
      {cloud.error && (
        <FormMessage tone="error" className="mb-4">
          {cloud.error}
        </FormMessage>
      )}
      <ul className={GRID}>
        {!search && <NewProjectCard />}
        {shown.map((project) => {
          const meta = `${project.width} × ${project.height} px · Edited ${editedAgo(project.at)}`;
          return project.kind === "local" ? (
            <ProjectCard
              key={project.id}
              name={project.name}
              meta={meta}
              thumbnail={<TileThumbnail image={project.image} />}
              open={{ href: editorUrl(project.id) }}
              menu={[
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
              open={{ onClick: () => void cloud.open(project.tile) }}
              opening={cloud.busy === project.id}
              disabled={cloud.busy !== null}
              menu={[
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
      {search && !shown.length && (
        <EmptyState
          title="Nothing matches your search"
          description="Try a different name."
        />
      )}
      {!done && <div ref={sentinel} aria-hidden="true" className="h-px" />}
    </section>
  );
}
