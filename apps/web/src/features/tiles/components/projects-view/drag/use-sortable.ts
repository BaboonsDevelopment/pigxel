"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { swallowNextClick } from "./project-drag";

const THRESHOLD = 6;
const SORT_ATTRIBUTE = "data-sort-id";

function moveBefore(ids: string[], id: string, target: string) {
  const from = ids.indexOf(id);
  const to = ids.indexOf(target);
  const next = ids.filter((other) => other !== id);
  next.splice(to, 0, id);
  return from === -1 || to === -1 ? ids : next;
}

function itemAt(x: number, y: number) {
  return (
    document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>(`[${SORT_ATTRIBUTE}]`)
      ?.getAttribute(SORT_ATTRIBUTE) ?? null
  );
}

export type SortProps = ReturnType<ReturnType<typeof useSortable>["itemProps"]>;

export function useSortable<T extends { id: string }>(
  list: T[],
  onReorder: (ids: string[]) => void,
) {
  const [order, setOrder] = useState<string[] | null>(null);
  const [lifted, setLifted] = useState<{
    id: string;
    dx: number;
    dy: number;
  } | null>(null);
  const items = useRef(new Map<string, HTMLElement>());

  const ids = order ?? list.map((item) => item.id);
  const byId = new Map(list.map((item) => [item.id, item]));
  const sorted = [
    ...ids.flatMap((id) => byId.get(id) ?? []),
    ...list.filter((item) => !ids.includes(item.id)),
  ];

  const start = (event: ReactPointerEvent, id: string) => {
    const element = items.current.get(id);
    if (event.button !== 0 || event.pointerType === "touch" || !element) return;
    const origin = { x: event.clientX, y: event.clientY };
    const slot = { x: element.offsetLeft, y: element.offsetTop };
    const initial = sorted.map((item) => item.id);
    let current = initial;
    let active = false;

    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      setLifted(null);
    };

    const move = (e: PointerEvent) => {
      if (!active) {
        if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) < THRESHOLD)
          return;
        active = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }
      const target = itemAt(e.clientX, e.clientY);
      if (target && target !== id) {
        current = moveBefore(current, id, target);
        setOrder(current);
      }
      setLifted({
        id,
        dx: e.clientX - origin.x - (element.offsetLeft - slot.x),
        dy: e.clientY - origin.y - (element.offsetTop - slot.y),
      });
    };

    const up = () => {
      finish();
      if (!active) return;
      swallowNextClick();
      if (current.join() !== initial.join()) onReorder(current);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const itemProps = (id: string) => {
    const isLifted = lifted?.id === id;
    const style: CSSProperties | undefined = isLifted
      ? {
          translate: `${lifted.dx}px ${lifted.dy}px`,
          scale: "1.05",
          zIndex: 50,
          pointerEvents: "none",
          transition: "scale 150ms ease-out",
        }
      : undefined;
    return {
      ref: (element: HTMLElement | null) => {
        if (element) items.current.set(id, element);
        else items.current.delete(id);
      },
      [SORT_ATTRIBUTE]: id,
      onPointerDown: (event: ReactPointerEvent) => start(event, id),
      style,
      lifted: isLifted,
    };
  };

  return { items: sorted, itemProps };
}
