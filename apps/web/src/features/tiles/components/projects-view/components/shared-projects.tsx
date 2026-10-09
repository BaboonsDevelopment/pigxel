"use client";

import Link from "next/link";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { PixelImage } from "@/components/ui/pixel-image";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { ROLE_LABELS, type SharedProject } from "@/features/sharing/sharing";
import {
  useCopySharedProject,
  useLeaveSharedProject,
  useSharedProjects,
} from "../../../queries/shared-projects";
import { useCloudTileActions } from "../../../tile-actions";
import { ProjectCard } from "../../project-card/project-card";
import { editedAgo } from "../helpers";
import { RoleBadge } from "./project-grid/badges";
import { SectionHeader } from "./section-header";

export function SharedProjects({
  userId,
  query,
  grid,
}: {
  userId: string;
  query: string;
  grid: string;
}) {
  const shared = useSharedProjects();
  const cloud = useCloudTileActions(userId);
  const copy = useCopySharedProject();
  const copying = copy.isPending ? copy.variables.id : null;
  const leave = useLeaveSharedProject(userId);
  const confirmLeave = async (project: SharedProject) => {
    const confirmed = await confirmDialog({
      title: `Leave “${project.name}”?`,
      message:
        "It goes away from Shared and you lose access. Changes you haven’t saved to Pigxel cloud are lost. The owner can invite you again.",
      confirmLabel: "Leave",
    });
    if (confirmed) leave.mutate(project);
  };
  const search = query.trim().toLowerCase();
  const projects = (shared.data ?? []).filter((project) =>
    project.name.toLowerCase().includes(search),
  );

  return (
    <section aria-labelledby="shared-heading">
      <SectionHeader
        id="shared-heading"
        title="Shared with you"
        count={shared.data ? String(projects.length) : ""}
        className="mb-3"
      />
      {(cloud.error ??
        shared.error?.message ??
        copy.error?.message ??
        leave.error?.message) && (
        <FormMessage tone="error" className="mb-4">
          {cloud.error ??
            shared.error?.message ??
            copy.error?.message ??
            leave.error?.message}
        </FormMessage>
      )}
      {copy.isSuccess && (
        <FormMessage
          tone="success"
          className="mb-4 animate-in fade-in duration-150"
        >
          “{copy.data.name}” is now in your projects. Only you can see it.{" "}
          <Link
            href="/tiles?tab=projects"
            className="text-link-accent hover:underline"
          >
            Go to Projects
          </Link>
        </FormMessage>
      )}
      {projects.length > 0 ? (
        <ul className={grid}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              name={project.name}
              meta={`${project.owner ? `by @${project.owner} · ` : ""}Edited ${editedAgo(Date.parse(project.updatedAt))}`}
              thumbnail={
                project.thumbnail && (
                  <PixelImage src={project.thumbnail} alt="" />
                )
              }
              badges={<RoleBadge label={ROLE_LABELS[project.role]} />}
              open={{ onClick: () => void cloud.open(project) }}
              opening={cloud.busy === project.id || copying === project.id}
              busyLabel={copying === project.id ? "Copying…" : undefined}
              disabled={cloud.busy !== null || copying !== null}
              menu={[
                { label: "Open", onSelect: () => void cloud.open(project) },
                {
                  label: "Make a private copy",
                  onSelect: () => copy.mutate(project),
                },
                {
                  label: "Leave",
                  destructive: true,
                  onSelect: () => void confirmLeave(project),
                },
              ]}
            />
          ))}
        </ul>
      ) : (
        shared.data &&
        (search ? (
          <EmptyState
            title="Nothing matches your search"
            description="Try a different name."
          />
        ) : (
          <EmptyState
            title="Nothing shared with you yet"
            description="When someone shares a project with you and you accept, it shows up here."
          />
        ))
      )}
    </section>
  );
}
