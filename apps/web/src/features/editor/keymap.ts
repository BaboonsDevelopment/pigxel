import type { Command, Shortcut, ToolId } from "./constants";
import { TOOLS } from "./tools";

export type ActionId = `command:${Command}` | `tool:${ToolId}`;
export type Keymap = Record<ActionId, string[]>;

export const COMMAND_LABELS: Partial<Record<Command, string>> = {
  save: "Save",
  open: "Open",
  export: "Export",
  undo: "Undo",
  redo: "Redo",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoomReset: "Reset zoom",
  layerAbove: "Layer above",
  layerBelow: "Layer below",
  newLayer: "New layer",
  clearLayer: "Clear / delete",
  newFrame: "Duplicate frame",
  previousFrame: "Previous frame",
  nextFrame: "Next frame",
  penSmaller: "Smaller brush",
  penBigger: "Bigger brush",
  swapColors: "Swap colours",
  selectAll: "Select all",
  deselect: "Deselect",
  reselect: "Reselect",
  invertSelection: "Invert selection",
  copy: "Copy",
  cut: "Cut",
  dropSelection: "Put the selection down",
  flipHorizontal: "Flip horizontally",
  flipVertical: "Flip vertically",
  rotateRight: "Rotate 90° right",
  nudgeUp: "Nudge up",
  nudgeDown: "Nudge down",
  nudgeLeft: "Nudge left",
  nudgeRight: "Nudge right",
  toggleOnion: "Onion skin",
  togglePreview: "Preview window",
  toggleCanvasOnly: "Canvas only",
  toggleFullScreen: "Full screen",
};

const COMMAND_KEYS: Partial<Record<Command, string[]>> = {
  save: ["Ctrl+S"],
  open: ["Ctrl+O"],
  export: ["Ctrl+E"],
  undo: ["Ctrl+Z"],
  redo: ["Ctrl+Shift+Z", "Ctrl+Y"],
  zoomIn: ["Equal", "NumpadAdd", "Ctrl+Equal", "Ctrl+NumpadAdd"],
  zoomOut: ["Minus", "NumpadSubtract", "Ctrl+Minus", "Ctrl+NumpadSubtract"],
  zoomReset: ["Ctrl+0", "Ctrl+Numpad0"],
  layerAbove: ["Alt+ArrowUp"],
  layerBelow: ["Alt+ArrowDown"],
  newLayer: ["Shift+N"],
  clearLayer: ["Delete", "Backspace"],
  newFrame: ["Alt+N"],
  previousFrame: ["Comma"],
  nextFrame: ["Period"],
  penSmaller: ["BracketLeft"],
  penBigger: ["BracketRight"],
  swapColors: ["X"],
  selectAll: ["Ctrl+A"],
  deselect: ["Ctrl+D", "Escape"],
  reselect: ["Ctrl+Shift+D"],
  invertSelection: ["Ctrl+Shift+I"],
  copy: ["Ctrl+C"],
  cut: ["Ctrl+X"],
  dropSelection: ["Enter", "NumpadEnter"],
  flipHorizontal: ["Shift+H"],
  flipVertical: ["Shift+V"],
  rotateRight: [],
  nudgeUp: ["ArrowUp"],
  nudgeDown: ["ArrowDown"],
  nudgeLeft: ["ArrowLeft"],
  nudgeRight: ["ArrowRight"],
  toggleOnion: ["F3"],
  togglePreview: ["F7"],
  toggleCanvasOnly: ["Tab"],
  toggleFullScreen: ["F11"],
};

const WHILE_TYPING = new Set<string>([
  "command:save",
  "command:open",
  "command:export",
]);

export const COMMANDS = Object.keys(COMMAND_KEYS) as Command[];

export const DEFAULT_KEYMAP = Object.fromEntries([
  ...COMMANDS.map((command) => [`command:${command}`, COMMAND_KEYS[command]!]),
  ...TOOLS.map((tool) => [
    `tool:${tool.id}`,
    [`${tool.shift ? "Shift+" : ""}${tool.shortcut}`],
  ]),
]) as Keymap;

const PHOTOSHOP: Partial<Keymap> = {
  "tool:brush": ["B"],
  "tool:pen": ["Shift+B"],
  "tool:lasso": ["L"],
  "tool:polygonLasso": ["Shift+L"],
  "tool:line": ["Shift+N"],
  "tool:curve": [],
  "tool:contour": [],
  "tool:polygon": [],
  "tool:jumble": [],
  "command:newLayer": ["Ctrl+Shift+N"],
  "command:toggleFullScreen": ["F"],
  "command:zoomReset": ["Ctrl+1", "Ctrl+0"],
  "command:redo": ["Ctrl+Shift+Z"],
  "command:newFrame": [],
};

export const KEY_PRESETS: { id: string; label: string; keys: Keymap }[] = [
  { id: "aseprite", label: "Pigxel, like Aseprite", keys: DEFAULT_KEYMAP },
  {
    id: "photoshop",
    label: "Like Photoshop",
    keys: { ...DEFAULT_KEYMAP, ...PHOTOSHOP },
  },
];

const MODIFIERS = new Set([
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
]);

export function comboOf(e: {
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): string | null {
  if (!e.code || MODIFIERS.has(e.code)) return null;
  const key = e.code.replace(/^Key/, "").replace(/^Digit/, "");
  return [
    (e.ctrlKey || e.metaKey) && "Ctrl",
    e.altKey && "Alt",
    e.shiftKey && "Shift",
    key,
  ]
    .filter(Boolean)
    .join("+");
}

const KEY_NAMES: Record<string, string> = {
  Comma: ",",
  Period: ".",
  BracketLeft: "[",
  BracketRight: "]",
  Equal: "=",
  Minus: "−",
  NumpadAdd: "Num +",
  NumpadSubtract: "Num −",
  NumpadEnter: "Num Enter",
  Numpad0: "Num 0",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Delete: "Del",
  Escape: "Esc",
  Semicolon: ";",
  Quote: "'",
  Slash: "/",
  Backslash: "\\",
  Backquote: "`",
  Space: "Space",
};

export function keyLabel(combo: string, mod = "Ctrl+") {
  const parts = combo.split("+");
  const key = parts.pop()!;
  return (
    parts.map((part) => (part === "Ctrl" ? mod : `${part}+`)).join("") +
    (KEY_NAMES[key] ?? key)
  );
}

export const keysLabel = (keymap: Keymap, action: ActionId, mod?: string) => {
  const first = keymap[action]?.[0];
  return first ? keyLabel(first, mod) : undefined;
};

export function actionFor(
  e: KeyboardEvent,
  keymap: Keymap,
  typing: boolean,
): Shortcut | null {
  const combo = comboOf(e);
  if (!combo) return null;
  const action = (Object.keys(keymap) as ActionId[]).find((id) =>
    keymap[id].includes(combo),
  );
  if (!action || (typing && !WHILE_TYPING.has(action))) return null;
  const [kind, name] = action.split(":") as ["command" | "tool", string];
  return kind === "tool"
    ? { tool: name as ToolId }
    : { command: name as Command };
}

export function withKey(
  keymap: Keymap,
  action: ActionId,
  combo: string,
): Keymap {
  const out = { ...keymap };
  for (const id of Object.keys(out) as ActionId[])
    if (out[id].includes(combo))
      out[id] = out[id].filter((key) => key !== combo);
  out[action] = [...out[action], combo];
  return out;
}

export const ownerOf = (keymap: Keymap, combo: string) =>
  (Object.keys(keymap) as ActionId[]).find((id) => keymap[id].includes(combo));

const keymapKey = (userId: string) => `pigxel:keys:v1:${userId}`;

export function readKeymap(userId: string): Keymap {
  try {
    const raw: unknown = JSON.parse(
      localStorage.getItem(keymapKey(userId)) ?? "null",
    );
    if (!raw || typeof raw !== "object") return DEFAULT_KEYMAP;
    const saved = raw as Record<string, unknown>;
    return Object.fromEntries(
      (Object.keys(DEFAULT_KEYMAP) as ActionId[]).map((id) => {
        const keys = saved[id];
        return [
          id,
          Array.isArray(keys) && keys.every((key) => typeof key === "string")
            ? keys
            : DEFAULT_KEYMAP[id],
        ];
      }),
    ) as Keymap;
  } catch {
    return DEFAULT_KEYMAP;
  }
}

export function writeKeymap(userId: string, keymap: Keymap) {
  try {
    localStorage.setItem(keymapKey(userId), JSON.stringify(keymap));
  } catch {}
}
