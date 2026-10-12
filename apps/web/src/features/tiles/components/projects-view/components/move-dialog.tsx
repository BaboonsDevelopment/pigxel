"use client";

import { useState } from "react";
import { ModalButton } from "@/components/ui/modal-button";
import { Dialog, DialogBody, DialogFooter } from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { showSuccess } from "@/components/ui/snackbar";
import { createFolder, moveTileToFolder } from "../../../actions";
import { FOLDER_NAME_MAX, type Folder } from "../../../folders";
import { movedMessage } from "../../../constants";
import { PixelFolder } from "./pixel-folder";

const projectsCount = (count: number) =>
  count === 1 ? "1 project" : `${count} projects`;

export function MoveDialog({
  tiles,
  folders,
  currentFolderId,
  onMoved,
  onClose,
}: {
  tiles: { id: string; name: string }[];
  folders: Folder[];
  currentFolderId?: string | null;
  onMoved: (folderId: string | null) => void;
  onClose: () => void;
}) {
  const [target, setTarget] = useState<string | null | undefined>(
    currentFolderId,
  );
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const move = async () => {
    setSaving(true);
    setError(null);
    let folderId = target ?? null;
    if (newName.trim()) {
      const created = await createFolder(newName);
      if (created.error || !created.id) {
        setSaving(false);
        return setError(created.error ?? "Couldn’t create the folder.");
      }
      folderId = created.id;
    }
    const results = await Promise.all(
      tiles.map((tile) => moveTileToFolder(tile.id, folderId)),
    );
    setSaving(false);
    const failed = results.find((result) => result.error);
    if (failed) return setError(failed.error ?? "Couldn’t move that.");
    showSuccess(
      newName.trim() ? "Folder created!" : movedMessage(tiles.length),
    );
    onMoved(folderId);
    onClose();
  };

  const options = [
    { id: null, name: "My projects", count: null },
    ...folders.map((f) => ({ id: f.id, name: f.name, count: f.count })),
  ];

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <ModalHeader title="Move to Folder" />
      <DialogBody className="grid gap-4 py-5">
        <p className="text-sm text-muted-foreground">
          Choose a new home for{" "}
          {tiles.length === 1 ? tiles[0]?.name : projectsCount(tiles.length)}.
        </p>
        <ul
          role="radiogroup"
          aria-label="Folder"
          className="grid max-h-80 gap-1 overflow-y-auto rounded-xl border bg-pink-base p-2"
        >
          {options.map((option) => {
            const checked = !newName.trim() && target === option.id;
            return (
              <li key={option.id ?? "none"}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => {
                    setTarget(option.id);
                    setNewName("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    checked ? "bg-pastel-pink-soft" : "hover:bg-muted",
                  )}
                >
                  <PixelFolder className="h-6 w-7 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {option.name}
                    </span>
                    {option.count !== null && (
                      <span className="block text-[11px] text-muted-foreground">
                        {projectsCount(option.count)}
                      </span>
                    )}
                  </span>
                  {checked && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5 shrink-0"
                    >
                      <path d="m2.5 8.5 3.5 4 7.5-9" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <Input
          aria-label="New folder name"
          placeholder="Or name a new folder"
          maxLength={FOLDER_NAME_MAX}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="h-12 rounded-xl px-4 text-base"
        />
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton type="button" variant="secondary" onClick={onClose}>
          Cancel
        </ModalButton>
        <ModalButton
          type="button"
          disabled={
            saving ||
            (!newName.trim() &&
              (target === undefined || target === currentFolderId))
          }
          onClick={() => void move()}
        >
          {saving ? "Moving…" : "Move"}
        </ModalButton>
      </DialogFooter>
    </Dialog>
  );
}
