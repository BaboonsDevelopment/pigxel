"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { cn } from "@pigxel/ui/lib/utils";
import {
  COMMANDS,
  COMMAND_LABELS,
  DEFAULT_KEYMAP,
  KEY_PRESETS,
  comboOf,
  keyLabel,
  ownerOf,
  resetAction,
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
  const [listening, setListening] = useState<ActionId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

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
    <Dialog
      onClose={onClose}
      size="md"
      portal
      onCancel={(e) => {
        if (listening) e.preventDefault();
      }}
    >
      <ModalHeader title="Keyboard Shortcuts" />
      <DialogBody className="grid gap-4 py-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Start from</span>
          {KEY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="h-9 rounded-xl border bg-background px-3 text-sm transition-colors hover:bg-pink-base"
              onClick={() => {
                setNotice(null);
                onChange(preset.keys);
              }}
            >
              {preset.label}
            </button>
          ))}
          <input
            type="search"
            aria-label="Find an action"
            placeholder="Find…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ml-auto h-10 w-40 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
          />
        </div>

        {notice && (
          <p
            className="rounded-xl bg-attention-soft px-4 py-2 text-xs"
            role="status"
          >
            {notice}
          </p>
        )}

        <div className="max-h-[50dvh] space-y-4 overflow-y-auto rounded-xl border bg-background p-3">
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
                    className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted/60"
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
                          "border-solid border-pink-strong text-pink-strong",
                      )}
                    >
                      {listening === id ? "Press keys… (Esc cancels)" : "+"}
                    </button>
                    {keymap[id].join() !==
                      (DEFAULT_KEYMAP[id] ?? []).join() && (
                      <button
                        type="button"
                        aria-label={`Reset ${label(id)} to its default keys`}
                        title={
                          DEFAULT_KEYMAP[id]?.length
                            ? `Back to ${DEFAULT_KEYMAP[id]!.map((combo) => keyLabel(combo, mod)).join(", ")}`
                            : "Back to no keys"
                        }
                        onClick={() => {
                          const taken = (DEFAULT_KEYMAP[id] ?? [])
                            .map((combo) => ownerOf(keymap, combo))
                            .find((owner) => owner && owner !== id);
                          setNotice(
                            taken
                              ? `Default keys moved here from “${label(taken)}”.`
                              : null,
                          );
                          onChange(resetAction(keymap, id));
                        }}
                        className="h-6 rounded px-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <CloseButton />
      </DialogFooter>
    </Dialog>
  );
}

function CloseButton() {
  const { close } = useDialog();
  return (
    <ModalButton variant="secondary" onClick={close}>
      Close
    </ModalButton>
  );
}
