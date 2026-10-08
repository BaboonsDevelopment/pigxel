"use client";

import {
  createContext,
  useContext,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { DragGhost } from "./drag-ghost";

const THRESHOLD = 6;
const LANDING_MS = 260;

export type DraggedProjects = {
  ids: string[];
  name: string;
  thumbnail: string | null;
};

export type DragState = {
  projects: DraggedProjects;
  x: number;
  y: number;
  landing: { x: number; y: number } | null;
};

type DragContext = {
  drag: DragState | null;
  over: string | null;
  start: (event: ReactPointerEvent, projects: DraggedProjects) => void;
};

const Context = createContext<DragContext | null>(null);

const FOLDER_ATTRIBUTE = "data-folder-drop";

function folderAt(x: number, y: number) {
  const target = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>(`[${FOLDER_ATTRIBUTE}]`);
  return target
    ? {
        id: target.getAttribute(FOLDER_ATTRIBUTE)!,
        rect: target.getBoundingClientRect(),
      }
    : null;
}

export function swallowNextClick() {
  const swallow = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  window.addEventListener("click", swallow, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", swallow, true), 0);
}

export function ProjectDragProvider({
  onDrop,
  children,
}: {
  onDrop: (ids: string[], folderId: string) => void;
  children: ReactNode;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const start = (event: ReactPointerEvent, projects: DraggedProjects) => {
    if (event.button !== 0 || event.pointerType === "touch") return;
    const origin = { x: event.clientX, y: event.clientY };
    let active = false;
    let target: ReturnType<typeof folderAt> = null;

    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", escape);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      setOver(null);
    };

    const move = (e: PointerEvent) => {
      if (!active) {
        if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) < THRESHOLD)
          return;
        active = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }
      target = folderAt(e.clientX, e.clientY);
      setOver(target?.id ?? null);
      setDrag({ projects, x: e.clientX, y: e.clientY, landing: null });
    };

    const up = () => {
      finish();
      if (!active) return;
      swallowNextClick();
      if (!target) return setDrag(null);
      const { id, rect } = target;
      setDrag(
        (current) =>
          current && {
            ...current,
            landing: {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            },
          },
      );
      setTimeout(() => setDrag(null), LANDING_MS);
      onDrop(projects.ids, id);
    };

    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      finish();
      setDrag(null);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", escape);
  };

  return (
    <Context value={{ drag, over, start }}>
      {children}
      {drag && <DragGhost drag={drag} />}
    </Context>
  );
}

function useDragContext() {
  const context = useContext(Context);
  if (!context) throw new Error("Wrap projects in ProjectDragProvider.");
  return context;
}

export function useProjectDrag() {
  const { drag, start } = useDragContext();
  return {
    start,
    isDragging: (id: string) =>
      drag !== null && !drag.landing && drag.projects.ids.includes(id),
  };
}

export function useFolderDropTarget(folderId: string) {
  const { drag, over } = useDragContext();
  return {
    dragging: drag !== null && !drag.landing,
    over: over === folderId,
    targetProps: { [FOLDER_ATTRIBUTE]: folderId },
  };
}
