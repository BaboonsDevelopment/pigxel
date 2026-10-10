import { describe, expect, it } from "vitest";
import {
  BOTTOM_HEIGHT,
  DEFAULT_LAYOUT,
  STACK_WIDTH,
  movePanel,
  movesPanel,
  setPanelHeight,
  readLayout,
  setPanelShown,
  setToolShown,
  shownStacks,
  type DockSide,
  type Layout,
} from "@/features/editor/layout";

const stacks = (layout: Layout, side: DockSide) =>
  shownStacks(layout, side).map((s) => s.items.map((i) => i.id));

describe("editor layout", () => {
  it("starts with tools and colours left, palette and assistant right, timeline below", () => {
    expect(stacks(DEFAULT_LAYOUT, "left")).toEqual([["tools", "colors"]]);
    expect(stacks(DEFAULT_LAYOUT, "right")).toEqual([["palette", "assistant"]]);
    expect(stacks(DEFAULT_LAYOUT, "bottom")).toEqual([["timeline"]]);
  });
  it("drops a panel above or below another, into its stack", () => {
    const moved = movePanel(DEFAULT_LAYOUT, "palette", {
      kind: "panel",
      anchor: "colors",
      where: "below",
    });
    expect(stacks(moved, "left")).toEqual([["tools", "colors", "palette"]]);
    expect(stacks(moved, "right")).toEqual([["assistant"]]);
    const swapped = movePanel(DEFAULT_LAYOUT, "colors", {
      kind: "panel",
      anchor: "tools",
      where: "above",
    });
    expect(stacks(swapped, "left")).toEqual([["colors", "tools"]]);
  });
  it("drops a panel beside another, as a new stack", () => {
    const beside = movePanel(DEFAULT_LAYOUT, "palette", {
      kind: "panel",
      anchor: "tools",
      where: "right",
    });
    expect(stacks(beside, "left")).toEqual([["tools", "colors"], ["palette"]]);
    const alone = movePanel(DEFAULT_LAYOUT, "timeline", {
      kind: "panel",
      anchor: "assistant",
      where: "left",
    });
    expect(stacks(alone, "bottom")).toEqual([]);
    expect(stacks(alone, "right")).toEqual([
      ["timeline"],
      ["palette", "assistant"],
    ]);
    const below = movePanel(DEFAULT_LAYOUT, "palette", {
      kind: "panel",
      anchor: "timeline",
      where: "right",
    });
    expect(below.docks.bottom.stacks.map((s) => s.size)).toEqual([0.5, 0.5]);
  });
  it("drops a panel into an empty dock", () => {
    const empty = movePanel(DEFAULT_LAYOUT, "timeline", {
      kind: "panel",
      anchor: "palette",
      where: "above",
    });
    const back = movePanel(empty, "timeline", {
      kind: "dock",
      dock: "bottom",
      where: "end",
    });
    expect(stacks(back, "bottom")).toEqual([["timeline"]]);
  });
  it("drops a panel beside the canvas only, leaving the bottom dock its width", () => {
    const beside = movePanel(DEFAULT_LAYOUT, "tools", {
      kind: "dock",
      dock: "innerLeft",
      where: "end",
    });
    expect(stacks(beside, "innerLeft")).toEqual([["tools"]]);
    expect(stacks(beside, "left")).toEqual([["colors"]]);
    expect(stacks(beside, "bottom")).toEqual([["timeline"]]);
  });
  it("closes and brings back panels; moving a closed one shows it", () => {
    const closed = setPanelShown(DEFAULT_LAYOUT, "assistant", false);
    expect(stacks(closed, "right")).toEqual([["palette"]]);
    const moved = movePanel(closed, "assistant", {
      kind: "dock",
      dock: "left",
      where: "start",
    });
    expect(moved.hidden).toEqual(["tileset"]);
    expect(stacks(moved, "left")[0]).toEqual(["assistant"]);
  });
  it("leaves tools off the tool panel and brings them back", () => {
    const fewer = setToolShown(DEFAULT_LAYOUT, "blur", false);
    expect(fewer.hiddenTools).toEqual(["blur"]);
    expect(setToolShown(fewer, "blur", true).hiddenTools).toEqual([]);
  });
  it("reads broken or old layouts without losing a panel", () => {
    expect(readLayout(null)).toEqual(DEFAULT_LAYOUT);
    const odd = readLayout({
      docks: {
        left: {
          stacks: [
            {
              panels: ["palette", "ghost", "palette"],
              weights: [2],
              size: 9999,
            },
            { panels: [], weights: [], size: 100 },
          ],
        },
        right: { stacks: [{ panels: ["palette", "tools"], weights: [1, -3] }] },
        bottom: { size: 5, stacks: "nonsense" },
      },
      hidden: ["ghost", "colors"],
      hiddenTools: ["blur", 3],
      groupTools: { select: "lasso", draw: 5 },
    });
    expect(stacks(odd, "left")).toEqual([["palette"]]);
    expect(odd.docks.left.stacks[0]!.size).toBe(STACK_WIDTH.max);
    expect(odd.docks.right.stacks[0]).toMatchObject({
      panels: ["tools"],
      weights: [1],
    });
    expect(odd.docks.left.stacks.flatMap((s) => s.panels)).toContain("colors");
    expect(stacks(odd, "bottom")).toEqual([["timeline"]]);
    expect(odd.docks.bottom.size).toBe(BOTTOM_HEIGHT.min);
    expect(odd.hidden).toEqual(["colors", "tileset"]);
    expect(odd.hiddenTools).toEqual(["blur"]);
    expect(odd.groupTools).toEqual({ select: "lasso" });
  });
});

describe("panel moves and heights", () => {
  it("tells a drop that changes nothing from one that does", () => {
    expect(
      movesPanel(DEFAULT_LAYOUT, "colors", {
        kind: "panel",
        anchor: "tools",
        where: "below",
      }),
    ).toBe(false);
    expect(
      movesPanel(DEFAULT_LAYOUT, "colors", {
        kind: "panel",
        anchor: "tools",
        where: "above",
      }),
    ).toBe(true);
  });
  it("keeps a height set by hand, never below the least", () => {
    expect(setPanelHeight(DEFAULT_LAYOUT, "palette", 240).heights).toEqual({
      palette: 240,
    });
    expect(setPanelHeight(DEFAULT_LAYOUT, "palette", 3).heights.palette).toBe(
      56,
    );
  });
});

describe("tool groups", () => {
  it("puts every tool in exactly one group", async () => {
    const { TOOLS, TOOL_GROUPS } = await import("@/features/editor/tools");
    const grouped = TOOL_GROUPS.flatMap((g) => g.tools);
    expect([...grouped].sort()).toEqual(TOOLS.map((t) => t.id).sort());
  });
});

describe("panel tabs and floating panels", () => {
  it("groups a panel onto another as a tab and shows the dropped one", () => {
    const grouped = movePanel(DEFAULT_LAYOUT, "palette", {
      kind: "panel",
      anchor: "assistant",
      where: "tab",
    });
    expect(stacks(grouped, "right")).toEqual([["assistant"]]);
    const [item] = shownStacks(grouped, "right")[0]!.items;
    expect(item!.group).toEqual(["assistant", "palette"]);
    expect(item!.active).toBe("palette");
  });

  it("drags a tab back out, and moving the host keeps the group in place", () => {
    const grouped = movePanel(DEFAULT_LAYOUT, "palette", {
      kind: "panel",
      anchor: "assistant",
      where: "tab",
    });
    const out = movePanel(grouped, "palette", {
      kind: "panel",
      anchor: "colors",
      where: "below",
    });
    expect(stacks(out, "left")).toEqual([["tools", "colors", "palette"]]);
    expect(out.tabs).toEqual({});
    const hostMoved = movePanel(grouped, "assistant", {
      kind: "panel",
      anchor: "tools",
      where: "above",
    });
    expect(stacks(hostMoved, "right")).toEqual([["palette"]]);
    expect(stacks(hostMoved, "left")).toEqual([
      ["assistant", "tools", "colors"],
    ]);
  });

  it("floats a panel, moves it and docks it back", () => {
    const rect = { x: 40, y: 50, w: 300, h: 200 };
    const floated = movePanel(DEFAULT_LAYOUT, "palette", {
      kind: "float",
      rect,
    });
    expect(stacks(floated, "right")).toEqual([["assistant"]]);
    expect(floated.floating.palette).toEqual(rect);
    expect(movesPanel(floated, "palette", { kind: "float", rect })).toBe(true);
    const docked = movePanel(floated, "palette", {
      kind: "dock",
      dock: "right",
      where: "end",
    });
    expect(docked.floating).toEqual({});
    expect(stacks(docked, "right")).toEqual([["assistant"], ["palette"]]);
  });

  it("keeps tabs and floating panels when the layout is read back", () => {
    const grouped = movePanel(
      movePanel(DEFAULT_LAYOUT, "palette", {
        kind: "panel",
        anchor: "assistant",
        where: "tab",
      }),
      "colors",
      { kind: "float", rect: { x: 1, y: 2, w: 300, h: 300 } },
    );
    const read = readLayout(JSON.parse(JSON.stringify(grouped)));
    expect(read.tabs).toEqual({ assistant: ["palette"] });
    expect(read.active).toEqual({ assistant: "palette" });
    expect(read.floating.colors).toEqual({ x: 1, y: 2, w: 300, h: 300 });
    expect(stacks(read, "left")).toEqual([["tools"]]);
  });
});
