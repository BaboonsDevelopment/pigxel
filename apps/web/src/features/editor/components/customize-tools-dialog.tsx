"use client";

import { Checkbox } from "@pigxel/ui/components/choice";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { TOOL_GROUPS, toolById, type ToolId } from "../tools";

/** Choose which tools show in the tool column. */
export default function CustomizeToolsDialog({
  hiddenTools,
  keyOf,
  onChange,
  onClose,
}: {
  hiddenTools: string[];
  keyOf: (tool: ToolId) => string | undefined;
  onChange: (tool: string, shown: boolean) => void;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} size="lg" portal>
      <ModalHeader title="Customize Tools" />
      <DialogBody className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-2">
        {TOOL_GROUPS.map((group) => (
          <fieldset key={group.id} className="rounded-xl border p-3">
            <legend className="float-left mb-2 w-full text-sm font-semibold">
              {group.label}
            </legend>
            <div className="clear-left space-y-1.5">
              {group.tools.map((id) => {
                const tool = toolById(id);
                return (
                  <label
                    key={id}
                    className="flex min-w-0 items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={!hiddenTools.includes(id)}
                      onChange={(e) => onChange(id, e.target.checked)}
                    />
                    <span className="grid size-5 place-items-center text-muted-foreground">
                      {tool.icon}
                    </span>
                    <span className="flex-1">{tool.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {keyOf(id)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <DoneButton />
      </DialogFooter>
    </Dialog>
  );
}

function DoneButton() {
  const { close } = useDialog();
  return <ModalButton onClick={close}>Done</ModalButton>;
}
