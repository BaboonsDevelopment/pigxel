"use client";

import { useEffect, useRef } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Checkbox } from "@pigxel/ui/components/choice";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { TOOL_GROUPS, toolById } from "../tools";

/**
 * Which tools the tool panel shows, by group. A tool left out keeps its
 * shortcut; a group with none left disappears from the panel.
 */
export default function CustomizeToolsDialog({
  hiddenTools,
  onChange,
  onClose,
}: {
  hiddenTools: string[];
  onChange: (tool: string, shown: boolean) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => dialog.current?.showModal(), []);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="customize-tools-title"
      className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="border-b p-5">
        <SectionTitle id="customize-tools-title">Customize tools</SectionTitle>
        <Lead className="mt-1">
          Pick the tools to show. Hidden tools still work from their keys.
        </Lead>
      </div>
      <div className="grid max-h-[60dvh] grid-cols-1 gap-5 overflow-y-auto p-5 sm:grid-cols-2">
        {TOOL_GROUPS.map((group) => (
          <fieldset key={group.id}>
            <legend className="mb-2 text-sm font-medium">{group.label}</legend>
            <div className="space-y-1.5">
              {group.tools.map((id) => {
                const tool = toolById(id);
                return (
                  <label key={id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!hiddenTools.includes(id)}
                      onChange={(e) => onChange(id, e.target.checked)}
                    />
                    <span className="grid size-5 place-items-center text-muted-foreground">
                      {tool.icon}
                    </span>
                    <span className="flex-1">{tool.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {tool.shift ? "Shift+" : ""}
                      {tool.shortcut}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="flex justify-end border-t p-4">
        <Button type="button" onClick={() => dialog.current?.close()}>
          Done
        </Button>
      </div>
    </dialog>
  );
}
