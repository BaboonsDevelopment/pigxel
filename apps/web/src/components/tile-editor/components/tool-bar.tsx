"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { ToolId } from "../constants";
import { toolTitle } from "../helpers";
import { TOOL_GROUPS, toolById } from "../tools";

/** How long a press on a group's button takes to open its flyout. */
const HOLD_MS = 400;
type Beside = { top: number; left?: number; right?: number };

/**
 * Where something shown next to a button goes: to its right, or to its left
 * when the tool panel sits in the right dock. Placed on the page (fixed), so
 * the dock's scrolling doesn't cut it off.
 */
function beside(button: HTMLElement): Beside {
  const box = button.getBoundingClientRect();
  // Past the tool panel's edge, so it never covers the other buttons.
  const panel =
    button.closest("[aria-label='Tools']")?.getBoundingClientRect() ?? box;
  return panel.left > window.innerWidth / 2
    ? { top: box.top, right: window.innerWidth - panel.left + 6 }
    : { top: box.top, left: panel.right + 6 };
}

/**
 * The tools, one button per group (as in Aseprite): it shows the group's
 * active or last used tool. A click picks that tool; holding it, a
 * right-click or the corner mark opens the rest of the group. Tools left
 * out in Customize tools aren't shown, but their shortcuts still work.
 */
export function ToolBar({
  tool,
  onSelect,
  hiddenTools,
  groupTools,
}: {
  tool: ToolId;
  onSelect: (tool: ToolId) => void;
  hiddenTools: string[];
  /** The tool each group last showed, by group id. */
  groupTools: Record<string, string>;
}) {
  const [open, setOpen] = useState<{ group: string; at: Beside } | null>(null);
  // The tooltip of the button under the pointer: shown at once, unlike the
  // browser's title tooltip.
  const [tip, setTip] = useState<{ text: string; at: Beside } | null>(null);
  const hold = useRef<number | null>(null);
  const held = useRef(false);
  // Closes the flyout on a click anywhere else or Escape.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !(e.target as Element).closest("[data-tool-flyout]")
      )
        setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const groups = TOOL_GROUPS.flatMap((group) => {
    const tools = group.tools.filter((id) => !hiddenTools.includes(id));
    if (!tools.length) return [];
    const remembered = groupTools[group.id] as ToolId | undefined;
    const shown = tools.includes(tool)
      ? tool
      : remembered && tools.includes(remembered)
        ? remembered
        : tools[0]!;
    return [{ ...group, tools, shown }];
  });

  const openFlyout = (group: string, button: HTMLElement) => {
    setTip(null);
    setOpen({ group, at: beside(button) });
  };
  const flyout = open && groups.find((g) => g.id === open.group);

  return (
    <nav
      aria-label="Tools"
      // As many columns as the panel's width holds; the panel is as tall as
      // the rows they make.
      className="grid grid-cols-[repeat(auto-fill,2.5rem)] content-start justify-center gap-1 p-2"
    >
      {groups.map((group) => {
        const entry = toolById(group.shown);
        const active = group.tools.includes(tool);
        const more = group.tools.length > 1;
        return (
          <button
            key={group.id}
            type="button"
            aria-label={
              more ? `${entry.label} (${group.label} tools)` : entry.label
            }
            aria-pressed={active}
            // Every tool of the group, for guides that point at one.
            data-tools={`|${group.tools.map((id) => toolById(id).label).join("|")}|`}
            aria-haspopup={more ? "menu" : undefined}
            onPointerDown={(e) => {
              if (e.button !== 0 || !more) return;
              held.current = false;
              const button = e.currentTarget;
              hold.current = window.setTimeout(() => {
                held.current = true;
                openFlyout(group.id, button);
              }, HOLD_MS);
            }}
            onPointerUp={() => {
              if (hold.current) window.clearTimeout(hold.current);
              hold.current = null;
            }}
            onPointerEnter={(e) => {
              if (open) return;
              setTip({
                text: `${toolTitle(entry)}${more ? " · hold for more" : ""}`,
                at: beside(e.currentTarget),
              });
            }}
            onPointerLeave={() => {
              if (hold.current) window.clearTimeout(hold.current);
              hold.current = null;
              setTip(null);
            }}
            onClick={() => {
              // A hold opened the flyout instead.
              if (held.current) return;
              onSelect(group.shown);
            }}
            onContextMenu={(e) => {
              if (!more) return;
              e.preventDefault();
              openFlyout(group.id, e.currentTarget);
            }}
            className={cn(
              "group relative flex aspect-square w-full max-w-10 items-center justify-center justify-self-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2",
              active &&
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            )}
          >
            {entry.icon}
            {more && (
              <span
                aria-hidden="true"
                title={`More ${group.label.toLowerCase()} tools`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  openFlyout(group.id, e.currentTarget.parentElement!);
                }}
                className="absolute right-0 bottom-0 size-2.5 [clip-path:polygon(100%_0,100%_100%,0_100%)] bg-current opacity-60 hover:opacity-100"
              />
            )}
          </button>
        );
      })}

      {tip && !open && (
        <span
          aria-hidden="true"
          style={tip.at}
          className="pointer-events-none fixed z-50 mt-2 rounded-md bg-foreground px-2 py-1 text-xs font-medium whitespace-nowrap text-background shadow-md"
        >
          {tip.text}
        </span>
      )}
      {flyout && open && (
        <div
          role="menu"
          data-tool-flyout
          aria-label={`${flyout.label} tools`}
          style={open.at}
          className="fixed z-50 min-w-48 rounded-lg border bg-background p-1 shadow-lg"
        >
          {flyout.tools.map((id) => {
            const entry = toolById(id);
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={tool === id}
                onClick={() => {
                  onSelect(id);
                  setOpen(null);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                  tool === id && "bg-muted font-medium",
                )}
              >
                <span className="grid size-6 place-items-center">
                  {entry.icon}
                </span>
                <span className="flex-1">{entry.label}</span>
                <span className="text-xs text-muted-foreground">
                  {entry.shift ? "Shift+" : ""}
                  {entry.shortcut}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}
