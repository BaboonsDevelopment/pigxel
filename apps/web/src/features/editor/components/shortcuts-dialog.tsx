"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import {
  COMMANDS,
  COMMAND_LABELS,
  KEY_PRESETS,
  comboOf,
  keyLabel,
  ownerOf,
  withKey,
  type ActionId,
  type Keymap,
} from "../keymap";
import { TOOL_GROUPS, toolById } from "../tools";

const label = (id: ActionId) => {
  const [kind, name] = id.split(":") as ["command" | "tool", string];
  return kind === "tool"
    ? toolById(name as Parameters<typeof toolById>[0]).label
    : (COMMAND_LABELS[name as keyof typeof COMMAND_LABELS] ?? name);
};

export default function ShortcutsDialog({
  keymap,
  mod,
  onChange,
  onClose,
}: {
  keymap: Keymap;
  mod: string;
  onChange: (keymap: Keymap) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [listening, setListening] = useState<ActionId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  useEffect(() => dialog.current?.showModal(), []);

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape" && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        setListening(null);
        return;
      }
      const combo = comboOf(e);
      if (!combo) return;
      const owner = ownerOf(keymap, combo);
      setNotice(
        owner && owner !== listening
          ? `${keyLabel(combo, mod)} moved here from “${label(owner)}”.`
          : null,
      );
      onChange(withKey(keymap, listening, combo));
      setListening(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [listening, keymap, mod, onChange]);

  const sections: { title: string; actions: ActionId[] }[] = [
    ...TOOL_GROUPS.map((group) => ({
      title: group.label,
      actions: group.tools.map((id): ActionId => `tool:${id}`),
    })),
    {
      title: "Commands",
      actions: COMMANDS.map((command): ActionId => `command:${command}`),
    },
  ];
  const query = filter.trim().toLowerCase();

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onCancel={(e) => {
        if (listening) e.preventDefault();
      }}
      aria-labelledby="shortcuts-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <SectionTitle id="shortcuts-title">Keyboard shortcuts</SectionTitle>
          <Lead className="mt-1">
            Click + next to an action, then press the keys you want.
          </Lead>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={() => dialog.current?.close()}
          className="text-lg leading-none"
        >
          ×
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3 text-sm">
        <span className="text-muted-foreground">Start from</span>
        {KEY_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setNotice(null);
              onChange(preset.keys);
            }}
          >
            {preset.label}
          </Button>
        ))}
        <input
          type="search"
          aria-label="Find an action"
          placeholder="Find…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="ml-auto h-8 w-32 rounded-md border bg-background px-2 text-sm"
        />
      </div>

      {notice && (
        <p className="border-b bg-muted px-5 py-2 text-xs" role="status">
          {notice}
        </p>
      )}

      <div className="max-h-[55dvh] space-y-4 overflow-y-auto p-5">
        {sections.map(({ title, actions }) => {
          const shown = actions.filter((id) =>
            label(id).toLowerCase().includes(query),
          );
          if (!shown.length) return null;
          return (
            <section key={title} className="space-y-1">
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {title}
              </h3>
              {shown.map((id) => (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/60"
                >
                  <span className="flex-1">{label(id)}</span>
                  {keymap[id].map((combo) => (
                    <span
                      key={combo}
                      className="flex items-center gap-1 rounded border bg-background py-0.5 pr-0.5 pl-1.5 text-xs tabular-nums"
                    >
                      {keyLabel(combo, mod)}
                      <button
                        type="button"
                        aria-label={`Remove ${keyLabel(combo, mod)}`}
                        onClick={() =>
                          onChange({
                            ...keymap,
                            [id]: keymap[id].filter((key) => key !== combo),
                          })
                        }
                        className="grid size-4 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    aria-label={`Add a key for ${label(id)}`}
                    onClick={() => {
                      setNotice(null);
                      setListening(id);
                    }}
                    className={cn(
                      "h-6 rounded border border-dashed px-2 text-xs text-muted-foreground hover:text-foreground",
                      listening === id &&
                        "border-solid border-primary text-primary",
                    )}
                  >
                    {listening === id ? "Press keys… (Esc cancels)" : "+"}
                  </button>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </dialog>
  );
}
