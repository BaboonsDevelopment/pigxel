"use client";

import { useRef } from "react";
import { createRoot } from "react-dom/client";
import { ModalButton } from "@/components/ui/modal-button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { PixelImage } from "@/components/ui/pixel-image";

type DeletedProject = {
  title?: string;
  confirmLabel?: string;
  name: string;
  thumbnail?: string | null;
  size?: { width: number; height: number };
  detail?: string;
  message: string;
};

export const DELETE_FOR_GOOD =
  "Are you sure you want to delete this project? This action cannot be undone.";

export function confirmDeleteProject(project: DeletedProject) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  return new Promise<boolean>((resolve) => {
    root.render(
      <DeleteDialog
        project={project}
        onDone={(confirmed) => {
          resolve(confirmed);
          root.unmount();
          host.remove();
        }}
      />,
    );
  });
}

function DeleteDialog({
  project,
  onDone,
}: {
  project: DeletedProject;
  onDone: (confirmed: boolean) => void;
}) {
  const confirmed = useRef(false);
  return (
    <Dialog
      size="sm"
      onClose={() => onDone(confirmed.current)}
      aria-describedby="delete-project-message"
    >
      <DeleteBody
        project={project}
        onConfirm={() => (confirmed.current = true)}
      />
    </Dialog>
  );
}

function DeleteBody({
  project,
  onConfirm,
}: {
  project: DeletedProject;
  onConfirm: () => void;
}) {
  const { close } = useDialog();
  return (
    <>
      <ModalHeader
        title={project.title ?? "Delete Project"}
        className="bg-attention-soft"
      />
      <DialogBody className="grid gap-4 py-5">
        <div className="flex items-center gap-4">
          <span className="flex shrink-0 items-end gap-1">
            {project.thumbnail !== undefined && (
              <span className="block size-16 overflow-hidden rounded-lg bg-checker">
                {project.thumbnail && (
                  <PixelImage
                    src={project.thumbnail}
                    alt=""
                    className="size-full object-contain"
                  />
                )}
              </span>
            )}
            <PixelTrash />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {project.name}
            </span>
            {(project.size || project.detail) && (
              <span className="block text-[11px] text-muted-foreground tabular-nums">
                {project.size
                  ? `${project.size.width} × ${project.size.height} px`
                  : project.detail}
              </span>
            )}
          </span>
        </div>
        <p id="delete-project-message" className="text-sm">
          {project.message}
        </p>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton
          type="button"
          variant="secondary"
          autoFocus
          onClick={close}
        >
          Cancel
        </ModalButton>
        <ModalButton
          type="button"
          onClick={() => {
            onConfirm();
            close();
          }}
        >
          {project.confirmLabel ?? "Delete"}
        </ModalButton>
      </DialogFooter>
    </>
  );
}

function PixelTrash() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 12"
      shapeRendering="crispEdges"
      className="h-9 w-7.5 text-[#9c6b7f]"
      fill="currentColor"
    >
      <path d="M3 0h4v1H3ZM0 1h10v2H0Z" />
      <path d="M1 3h8v9H1Zm2 2v5h1V5Zm3 0v5h1V5Z" fillRule="evenodd" />
    </svg>
  );
}
