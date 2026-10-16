import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFS,
  openedFor,
  readPrefs,
  setToolShown,
  TIMELINE_HEIGHT,
} from "@/features/editor/editor-prefs";

describe("editor prefs", () => {
  it("falls back to the default layout for anything unreadable", () => {
    expect(readPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(readPrefs("nope")).toEqual(DEFAULT_PREFS);
    expect(
      readPrefs({ tab: "layers", sidebar: "yes", timelineHeight: "tall" }),
    ).toEqual(DEFAULT_PREFS);
  });

  it("keeps the tool choices of an old movable-panels layout, nothing else", () => {
    const old = {
      docks: { left: { stacks: [] } },
      floating: { palette: { x: 1, y: 2, w: 3, h: 4 } },
      hiddenTools: ["blur", "blur", 7],
      groupTools: { draw: "brush", bad: 3 },
      groupOrder: ["select"],
    };
    expect(readPrefs(old)).toEqual({
      ...DEFAULT_PREFS,
      hiddenTools: ["blur"],
      groupTools: { draw: "brush" },
    });
  });

  it("keeps the timeline height within bounds", () => {
    expect(readPrefs({ timelineHeight: 5 }).timelineHeight).toBe(
      TIMELINE_HEIGHT.min,
    );
    expect(readPrefs({ timelineHeight: 9999 }).timelineHeight).toBe(
      TIMELINE_HEIGHT.max,
    );
  });

  it("opens what a tile started from Home needs", () => {
    const closed = { ...DEFAULT_PREFS, sidebar: false, timeline: false };
    expect(openedFor(closed, "assistant")).toMatchObject({
      sidebar: true,
      tab: "assistant",
    });
    expect(openedFor(closed, "tileset")).toMatchObject({
      sidebar: true,
      tab: "tileset",
    });
    expect(openedFor(closed, "timeline")).toMatchObject({ timeline: true });
    expect(openedFor(closed)).toBe(closed);
  });

  it("hides and shows tools", () => {
    const hidden = setToolShown(DEFAULT_PREFS, "blur", false);
    expect(hidden.hiddenTools).toEqual(["blur"]);
    expect(setToolShown(hidden, "blur", true).hiddenTools).toEqual([]);
  });
});
