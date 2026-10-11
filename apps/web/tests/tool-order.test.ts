import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT, readLayout } from "@/features/editor/layout";
import { TOOL_GROUPS } from "@/features/editor/tools";
import {
  moveInOrder,
  dropInOrder,
  ordered,
  orderedToolGroups,
} from "@/features/editor/tool-order";

describe("tool ordering", () => {
  it("drops entries before or after a target in either direction", () => {
    expect(dropInOrder(["a", "b", "c", "d"], "a", "c", true)).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    expect(dropInOrder(["a", "b", "c", "d"], "d", "b", false)).toEqual([
      "a",
      "d",
      "b",
      "c",
    ]);
    expect(dropInOrder(["a", "b"], "a", "a", true)).toEqual(["a", "b"]);
    expect(dropInOrder(["a", "b"], "missing", "b", true)).toEqual(["a", "b"]);
  });
  it("keeps unconfigured and newly added entries in their default order", () => {
    expect(
      ordered(["a", "b", "c", "d"], ["c", "missing", "a"], (id) => id),
    ).toEqual(["c", "a", "b", "d"]);
    expect(orderedToolGroups([], []).map((group) => group.id)).toEqual(
      TOOL_GROUPS.map((group) => group.id),
    );
  });
  it("reorders groups and their tools without changing group membership", () => {
    const ids = TOOL_GROUPS.map((group) => group.id).reverse();
    const tools = TOOL_GROUPS.flatMap((group) => group.tools).reverse();
    const groups = orderedToolGroups(ids, tools);
    expect(groups.map((group) => group.id)).toEqual(ids);
    for (const group of groups) {
      expect(group.tools).toEqual(
        [...TOOL_GROUPS.find((g) => g.id === group.id)!.tools].reverse(),
      );
    }
  });
  it("moves one entry and respects the first and last positions", () => {
    expect(moveInOrder(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveInOrder(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
    expect(moveInOrder(["a", "b"], "a", -1)).toEqual(["a", "b"]);
    expect(moveInOrder(["a", "b"], "b", 1)).toEqual(["a", "b"]);
  });
  it("persists order with layouts and reads older layouts safely", () => {
    const layout = readLayout(
      JSON.parse(
        JSON.stringify({
          ...DEFAULT_LAYOUT,
          groupOrder: ["x", "x"],
          toolOrder: ["pen", "eraser"],
        }),
      ),
    );
    expect(layout.groupOrder).toEqual(["x"]);
    expect(layout.toolOrder).toEqual(["pen", "eraser"]);
    const old: Partial<typeof DEFAULT_LAYOUT> = { ...DEFAULT_LAYOUT };
    delete old.groupOrder;
    delete old.toolOrder;
    expect(readLayout(old).groupOrder).toEqual([]);
    expect(readLayout(old).toolOrder).toEqual([]);
  });
});
