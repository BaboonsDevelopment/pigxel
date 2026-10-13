"use client";

import { Fragment, type ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import {
  FLOAT_DEFAULT,
  MIN_PANEL,
  PANEL_LABELS,
  movePanel,
  setActiveTab,
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

export type PanelContent = {
  body: ReactNode;
  fill?: boolean;
  actions?: ReactNode;
};

export type SetLayout = (change: (layout: Layout) => Layout) => void;

export const centeredFloat = () => ({
  x: Math.max(8, Math.round((window.innerWidth - FLOAT_DEFAULT.w) / 2)),
  y: 120,
  ...FLOAT_DEFAULT,
});

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
      className={cn("absolute inset-y-0", leftish ? "-right-1" : "-left-1")}
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
        className="flex min-h-0 min-w-0 flex-col overflow-y-auto p-1"
        style={
          bottom
            ? { flex: `${stack.size / widthTotal} 1 0` }
            : { width: stack.size, flex: "none" }
        }
      >
        {stack.items.map((item, i) => {
          const collapsed = layout.collapsed.includes(item.id);
          const next = stack.items[i + 1];
          const bar = !collapsed ? (
            <Splitter
              className="h-1"
              axis="y"
              onStart={(el) => {
                const from =
                  el.previousElementSibling?.getBoundingClientRect().height ??
                  MIN_PANEL;
                const following =
                  next && !layout.collapsed.includes(next.id) ? next.id : null;
                const after = following
                  ? (el.nextElementSibling?.getBoundingClientRect().height ??
                    MIN_PANEL)
                  : 0;
                return (delta) => {
                  const change = following
                    ? Math.max(
                        MIN_PANEL - from,
                        Math.min(after - MIN_PANEL, delta),
                      )
                    : delta;
                  setLayout((l) => {
                    const resized = setPanelHeight(l, item.id, from + change);
                    return following
                      ? setPanelHeight(resized, following, after - change)
                      : resized;
                  });
                };
              }}
            />
          ) : (
            next && <div className="h-1 shrink-0" />
          );
          return (
            <Fragment key={item.id}>
              <Panel
                id={item.active}
                title={PANEL_LABELS[item.active]}
                collapsed={collapsed}
                fill={panels[item.active].fill}
                actions={panels[item.active].actions}
                height={layout.heights[item.id]}
                dragging={drag.dragging === item.active}
                tabs={item.group}
                onDragStart={drag.start}
                onSelectTab={(tab) =>
                  setLayout((l) => setActiveTab(l, item.id, tab))
                }
                onCollapse={(on) =>
                  setLayout((l) => setPanelCollapsed(l, item.id, on))
                }
                onFloat={() =>
                  setLayout((l) =>
                    movePanel(l, item.active, {
                      kind: "float",
                      rect: centeredFloat(),
                    }),
                  )
                }
                onClose={() =>
                  setLayout((l) => setPanelShown(l, item.active, false))
                }
              >
                {panels[item.active].body}
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
        className="relative flex shrink-0 flex-col bg-muted"
      >
        <Splitter
          axis="y"
          className="absolute inset-x-0 -top-1"
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
                    className="-mx-1 w-2"
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
      className="flex min-h-0 shrink-0 bg-muted"
    >
      {stacks.map((stack) => (
        <div key={stack.index} className="relative flex min-h-0">
          {column(stack)}
          {widthBar(stack.index, stack.size)}
        </div>
      ))}
    </aside>
  );
}
