"use client";

import { useState } from "react";
import { ModalButton } from "@/components/ui/modal-button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { EditorSelect } from "@/features/editor/components/editor-select";
import { PROJECT_NAME_MAX } from "../../../constants";
import type { Folder } from "../../../folders";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";

const copyName = (name: string) =>
  `${name.slice(0, PROJECT_NAME_MAX - 5)} copy`;

export function DuplicateDialog({
  name,
  folders,
  folderId,
  withFolder,
  onDuplicate,
  onClose,
}: {
  name: string;
  folders: Folder[];
  folderId: string | null;
  withFolder: boolean;
  onDuplicate: (
    name: string,
    folderId: string | null,
  ) => Promise<string | null>;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <DuplicateForm
        name={name}
        folders={folders}
        folderId={folderId}
        withFolder={withFolder}
        onDuplicate={onDuplicate}
      />
    </Dialog>
  );
}

function DuplicateForm({
  name: original,
  folders,
  folderId,
  withFolder,
  onDuplicate,
}: {
  name: string;
  folders: Folder[];
  folderId: string | null;
  withFolder: boolean;
  onDuplicate: (
    name: string,
    folderId: string | null,
  ) => Promise<string | null>;
}) {
  const { close } = useDialog();
  const [name, setName] = useState(() => copyName(original));
  const [target, setTarget] = useState(folderId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const duplicate = async () => {
    setSaving(true);
    setError(null);
    const failed = await onDuplicate(name.trim(), target || null);
    setSaving(false);
    if (failed) setError(failed);
    else close();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void duplicate();
      }}
      className="flex min-h-0 flex-col"
    >
      <ModalHeader title="Duplicate Project" />
      <DialogBody className="grid gap-5 py-5">
        <Field label="New name" htmlFor="duplicate-name">
          <Input
            id="duplicate-name"
            autoFocus
            maxLength={PROJECT_NAME_MAX}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            className="h-12 rounded-xl px-4 text-base"
          />
        </Field>
        {withFolder && (
          <Field label="Save to folder" htmlFor="duplicate-folder">
            <EditorSelect
              id="duplicate-folder"
              value={target}
              onChange={setTarget}
              options={[
                { value: "", label: "My projects" },
                ...folders.map((folder) => ({
                  value: folder.id,
                  label: folder.name,
                })),
              ]}
              className="h-12 w-full rounded-xl px-4 text-base"
            />
          </Field>
        )}
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton type="button" variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={saving || !name.trim()}>
          {saving ? "Duplicating…" : "Duplicate"}
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
