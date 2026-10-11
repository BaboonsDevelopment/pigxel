import { describe, expect, it } from "vitest";
import {
  DEFAULT_KEYMAP,
  KEY_PRESETS,
  actionFor,
  comboOf,
  keyLabel,
  withKey,
  parseKeymap,
  resetAction,
} from "@/features/editor/keymap";

const key = (code: string, mods: Partial<KeyboardEvent> = {}) =>
  ({
    code,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...mods,
  }) as KeyboardEvent;

describe("keyboard shortcuts", () => {
  it("names key presses the same way on every system", () => {
    expect(comboOf(key("KeyZ", { metaKey: true, shiftKey: true }))).toBe(
      "Ctrl+Shift+Z",
    );
    expect(comboOf(key("ShiftLeft", { shiftKey: true }))).toBeNull();
    expect(keyLabel("Ctrl+Shift+Z", "⌘")).toBe("⌘Shift+Z");
    expect(keyLabel("BracketLeft")).toBe("[");
  });

  it("keeps the old keys by default", () => {
    expect(actionFor(key("KeyB"), DEFAULT_KEYMAP, false)).toEqual({
      tool: "pen",
    });
    expect(
      actionFor(key("KeyM", { shiftKey: true }), DEFAULT_KEYMAP, false),
    ).toEqual({ tool: "ellipseMarquee" });
    expect(
      actionFor(key("KeyY", { ctrlKey: true }), DEFAULT_KEYMAP, false),
    ).toEqual({ command: "redo" });
  });

  it("ignores keys while typing, except save, open and export", () => {
    expect(actionFor(key("KeyB"), DEFAULT_KEYMAP, true)).toBeNull();
    expect(
      actionFor(key("KeyS", { ctrlKey: true }), DEFAULT_KEYMAP, true),
    ).toEqual({ command: "save" });
  });

  it("moves a key to its new action", () => {
    const next = withKey(DEFAULT_KEYMAP, "tool:brush", "B");
    expect(next["tool:pen"]).toEqual([]);
    expect(actionFor(key("KeyB"), next, false)).toEqual({ tool: "brush" });
  });

  it("has a Photoshop preset", () => {
    const photoshop = KEY_PRESETS.find((p) => p.id === "photoshop")!.keys;
    expect(actionFor(key("KeyL"), photoshop, false)).toEqual({
      tool: "lasso",
    });
  });
});

describe("resetting, syncing and opening the shortcuts list", () => {
  it("puts one action back to its default keys", () => {
    const changed = withKey(
      { ...DEFAULT_KEYMAP, "command:save": [] },
      "command:undo",
      "Ctrl+S",
    );
    const reset = resetAction(changed, "command:save");
    expect(reset["command:save"]).toEqual(DEFAULT_KEYMAP["command:save"]);
    expect(reset["command:undo"]).toEqual(DEFAULT_KEYMAP["command:undo"]);
  });
  it("opens the list with Shift + /", () => {
    const e = {
      code: "Slash",
      shiftKey: true,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    } as KeyboardEvent;
    expect(actionFor(e, DEFAULT_KEYMAP, false)).toEqual({
      command: "showShortcuts",
    });
  });
  it("reads synced keys and fills in missing actions", () => {
    const keys = parseKeymap({ "command:save": ["Ctrl+Shift+S"], junk: 1 });
    expect(keys["command:save"]).toEqual(["Ctrl+Shift+S"]);
    expect(keys["command:undo"]).toEqual(DEFAULT_KEYMAP["command:undo"]);
  });
});
