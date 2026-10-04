"use client";

import { Fragment, type ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import {
  MIN_PANEL,
  PANEL_LABELS,
  setBottomHeight,
  setPanelCollapsed,
  setPanelHeight,
  setPanelShown,
  onLeft,
  shownStacks,
  updateStack,
  type DockSide,
  type Layout,
  type PanelId,
} from "../../layout";
import { Panel } from "./panel";
import { Splitter, shareBetween } from "./splitter";
import type { PanelDrag } from "./use-panel-drag";

export type PanelContent = { body: ReactNode; fill?: boolean };

type SetLayout = (change: (layout: Layout) => Layout) => void;

export function Dock({
  side,
  layout,
  panels,
  drag,
  setLayout,
}: {
  side: DockSide;
  layout: Layout;
  panels: Record<PanelId, PanelContent>;
  drag: PanelDrag;
  setLayout: SetLayout;
}) {
  const stacks = shownStacks(layout, side);
  const bottom = side === "bottom";
  const leftish = onLeft(side);
  if (!stacks.length && (side === "innerLeft" || side === "innerRight"))
    return null;

  if (!stacks.length)
    return drag.dragging ? (
      <div
        data-dock={side}
        className={cn(
          "flex shrink-0 items-center justify-center border-dashed border-primary/50 bg-primary/5 text-[10px] tracking-wide text-primary uppercase",
          bottom ? "h-12 border-t" : "w-10 border-x [writing-mode:vertical-rl]",
        )}
      >
        Drop here
      </div>
    ) : null;

  const widthBar = (index: number, size: number) => (
    <Splitter
      axis="x"
      onStart={() => (delta) =>
        setLayout((l) =>
          updateStack(l, side, index, {
            size: size + (leftish ? delta : -delta),
          }),
        )
      }
    />
  );

  const widthTotal = stacks.reduce((sum, s) => sum + s.size, 0) || 1;
  const column = (stack: (typeof stacks)[number]) => {
    return (
      <div
        data-stack
        className="flex min-h-0 min-w-0 flex-col overflow-y-auto"
        style={
          bottom
            ? { flex: `${stack.size / widthTotal} 1 0` }
            : { width: stack.size, flex: "none" }
        }
      >
        {stack.items.map((item, i) => {
          const collapsed = layout.collapsed.includes(item.id);
          const next = stack.items[i + 1];
          const bar =
            next && !collapsed && !layout.collapsed.includes(next.id) ? (
              <Splitter
                axis="y"
                onStart={(el) => {
                  const from =
                    el.previousElementSibling?.getBoundingClientRect().height ??
                    MIN_PANEL;
                  return (delta) =>
                    setLayout((l) => setPanelHeight(l, item.id, from + delta));
                }}
              />
            ) : (
              next && <div className="h-px shrink-0 bg-border" />
            );
          return (
            <Fragment key={item.id}>
              <Panel
                id={item.id}
                title={PANEL_LABELS[item.id]}
                collapsed={collapsed}
                fill={panels[item.id].fill}
                height={layout.heights[item.id]}
                dragging={drag.dragging === item.id}
                onDragStart={drag.start}
                onCollapse={(on) =>
                  setLayout((l) => setPanelCollapsed(l, item.id, on))
                }
                onClose={() =>
                  setLayout((l) => setPanelShown(l, item.id, false))
                }
              >
                {panels[item.id].body}
              </Panel>
              {bar}
            </Fragment>
          );
        })}
      </div>
    );
  };

  if (bottom)
    return (
      <div
        data-dock="bottom"
        style={{ height: layout.docks.bottom.size }}
        className="flex shrink-0 flex-col border-t bg-background"
      >
        <Splitter
          axis="y"
          onStart={() => {
            const height = layout.docks.bottom.size;
            return (delta) =>
              setLayout((l) => setBottomHeight(l, height - delta));
          }}
        />
        <div className="flex min-h-0 flex-1">
          {stacks.map((stack, i) => {
            const next = stacks[i + 1];
            return (
              <Fragment key={stack.index}>
                {column(stack)}
                {next && (
                  <Splitter
                    axis="x"
                    className="bg-border"
                    onStart={(el) => {
                      const share = shareBetween(
                        el,
                        "x",
                        [stack.size, next.size],
                        MIN_PANEL * 2,
                      );
                      return (delta) =>
                        setLayout((l) => {
                          const [a, b] = share(delta);
                          return updateStack(
                            updateStack(l, side, stack.index, { size: a }),
                            side,
                            next.index,
                            { size: b },
                          );
                        });
                    }}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    );

  return (
    <aside
      data-dock={side}
      aria-label={leftish ? "Left panels" : "Right panels"}
      className={cn(
        "flex min-h-0 shrink-0 bg-background",
        leftish ? "border-r" : "border-l",
      )}
    >
      {stacks.map((stack, i) => (
        <Fragment key={stack.index}>
          {!leftish && widthBar(stack.index, stack.size)}
          {column(stack)}
          {leftish && widthBar(stack.index, stack.size)}
          {i < stacks.length - 1 && <div className="w-px shrink-0 bg-border" />}
        </Fragment>
      ))}
    </aside>
  );
}
