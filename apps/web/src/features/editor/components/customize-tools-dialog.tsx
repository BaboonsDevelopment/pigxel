"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { Button } from "@pigxel/ui/components/button";
import { Checkbox } from "@pigxel/ui/components/choice";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { toolById, type ToolId } from "../tools";
import { dropInOrder, moveInOrder, orderedToolGroups } from "../tool-order";

type Dragged = { kind: "group" | "tool"; id: string; group?: string };

export default function CustomizeToolsDialog({
  hiddenTools,
  groupOrder,
  toolOrder,
  onOrderChange,
  keyOf,
  onChange,
  onClose,
}: {
  hiddenTools: string[];
  groupOrder: string[];
  toolOrder: string[];
  onOrderChange: (groupOrder: string[], toolOrder: string[]) => void;
  keyOf: (tool: ToolId) => string | undefined;
  onChange: (tool: string, shown: boolean) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => dialog.current?.showModal(), []);
  const groups = orderedToolGroups(groupOrder, toolOrder);
  const [dragged, setDragged] = useState<Dragged | null>(null);
  const [target, setTarget] = useState<{ id: string; after: boolean } | null>(
    null,
  );
  const endDrag = () => {
    setDragged(null);
    setTarget(null);
  };
  const startDrag = (e: DragEvent, item: Dragged) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
    setDragged(item);
  };
  const dragOver = (e: DragEvent<HTMLElement>, item: Dragged) => {
    if (
      !dragged ||
      dragged.kind !== item.kind ||
      dragged.id === item.id ||
      (item.kind === "tool" && dragged.group !== item.group)
    )
      return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    setTarget({ id: item.id, after: e.clientY > rect.top + rect.height / 2 });
  };
  const drop = (e: DragEvent<HTMLElement>, item: Dragged) => {
    if (
      !dragged ||
      dragged.kind !== item.kind ||
      (item.kind === "tool" && dragged.group !== item.group)
    )
      return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    if (item.kind === "group") {
      onOrderChange(
        dropInOrder(
          groups.map((g) => g.id),
          dragged.id,
          item.id,
          after,
        ),
        toolOrder,
      );
    } else {
      onOrderChange(
        groupOrder,
        groups.flatMap((g) =>
          g.id === item.group
            ? dropInOrder(g.tools, dragged.id, item.id, after)
            : g.tools,
        ),
      );
    }
    endDrag();
  };
  const dropClass = (id: string) =>
    target?.id === id &&
    (target.after ? "border-b-2 border-primary" : "border-t-2 border-primary");

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="customize-tools-title"
      className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="border-b p-5">
        <SectionTitle id="customize-tools-title">Customize tools</SectionTitle>
        <Lead className="mt-1">
          Pick the tools to show. Hidden tools still work from their keys. Use
          the drag handles or arrows to reorder groups and tools within each
          group.
        </Lead>
      </div>
      <div className="grid max-h-[60dvh] grid-cols-1 gap-5 overflow-y-auto p-5 sm:grid-cols-2">
        {groups.map((group, groupIndex) => (
          <fieldset
            key={group.id}
            onDragOver={(e) => dragOver(e, { kind: "group", id: group.id })}
            onDrop={(e) => drop(e, { kind: "group", id: group.id })}
            className={cn(
              "rounded-md",
              dragged?.kind === "group" &&
                dragged.id === group.id &&
                "opacity-40",
              dropClass(group.id),
            )}
          >
            <legend className="mb-2 w-full text-sm font-medium">
              <span className="flex items-center gap-2">
                <DragHandle
                  label={`${group.label} group`}
                  onDragStart={(e) =>
                    startDrag(e, { kind: "group", id: group.id })
                  }
                  onDragEnd={endDrag}
                />
                <span className="flex-1">{group.label}</span>
                <OrderButtons
                  label={`${group.label} group`}
                  first={groupIndex === 0}
                  last={groupIndex === groups.length - 1}
                  onMove={(direction) =>
                    onOrderChange(
                      moveInOrder(
                        groups.map((g) => g.id),
                        group.id,
                        direction,
                      ),
                      toolOrder,
                    )
                  }
                />
              </span>
            </legend>
            <div className="space-y-1.5">
              {group.tools.map((id, toolIndex) => {
                const tool = toolById(id);
                return (
                  <div
                    key={id}
                    onDragOver={(e) =>
                      dragOver(e, { kind: "tool", id, group: group.id })
                    }
                    onDrop={(e) =>
                      drop(e, { kind: "tool", id, group: group.id })
                    }
                    className={cn(
                      "flex items-center gap-2 rounded text-sm",
                      dragged?.kind === "tool" &&
                        dragged.id === id &&
                        "opacity-40",
                      dropClass(id),
                    )}
                  >
                    <DragHandle
                      label={tool.label}
                      onDragStart={(e) =>
                        startDrag(e, { kind: "tool", id, group: group.id })
                      }
                      onDragEnd={endDrag}
                    />
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                      <Checkbox
                        checked={!hiddenTools.includes(id)}
                        onChange={(e) => onChange(id, e.target.checked)}
                      />
                      <span className="grid size-5 place-items-center text-muted-foreground">
                        {tool.icon}
                      </span>
                      <span className="flex-1">{tool.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {keyOf(id)}
                      </span>
                    </label>
                    <OrderButtons
                      label={tool.label}
                      first={toolIndex === 0}
                      last={toolIndex === group.tools.length - 1}
                      onMove={(direction) =>
                        onOrderChange(
                          groupOrder,
                          groups.flatMap((g) =>
                            g.id === group.id
                              ? moveInOrder(g.tools, id, direction)
                              : g.tools,
                          ),
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="flex justify-between border-t p-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOrderChange([], [])}
        >
          Reset order
        </Button>
        <Button type="button" onClick={() => dialog.current?.close()}>
          Done
        </Button>
      </div>
    </dialog>
  );
}

function DragHandle({
  label,
  onDragStart,
  onDragEnd,
}: {
  label: string;
  onDragStart: (e: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      aria-label={`Drag ${label} to reorder`}
      title={`Drag ${label} to reorder`}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="size-6 shrink-0 cursor-grab rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
    >
      ⠿
    </button>
  );
}

function OrderButtons({
  label,
  first,
  last,
  onMove,
}: {
  label: string;
  first: boolean;
  last: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <span className="flex shrink-0 gap-1">
      <button
        type="button"
        aria-label={`Move ${label} earlier`}
        title="Move earlier"
        disabled={first}
        onClick={() => onMove(-1)}
        className="size-6 rounded hover:bg-muted disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        aria-label={`Move ${label} later`}
        title="Move later"
        disabled={last}
        onClick={() => onMove(1)}
        className="size-6 rounded hover:bg-muted disabled:opacity-30"
      >
        ↓
      </button>
    </span>
  );
}
