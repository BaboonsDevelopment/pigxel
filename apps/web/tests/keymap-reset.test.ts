import { describe, expect, it } from "vitest";
import {
  DEFAULT_KEYMAP,
  actionFor,
  parseKeymap,
  resetAction,
  withKey,
} from "@/features/editor/keymap";

describe("keyboard shortcuts", () => {
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
