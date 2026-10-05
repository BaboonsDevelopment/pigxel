"use client";

import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { createFolder, moveTileToFolder } from "../../../actions";
import { FOLDER_NAME_MAX, type Folder } from "../../../folders";

export function MoveDialog({
  tile,
  folders,
  currentFolderId,
  onMoved,
  onClose,
}: {
  tile: { id: string; name: string };
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
    const result = await moveTileToFolder(tile.id, folderId);
    setSaving(false);
    if (result.error) return setError(result.error);
    onMoved(folderId);
    onClose();
  };

  const options = [
    { id: null, name: "No folder" },
    ...folders.map((f) => ({ id: f.id, name: f.name })),
  ];

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <DialogHeader title="Move to folder" description={tile.name} />
      <DialogBody>
        <ul role="radiogroup" aria-label="Folder" className="grid gap-1">
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
                    "flex h-10 w-full items-center gap-3 rounded-lg border px-3 text-left text-sm transition-colors hover:bg-muted",
                    checked
                      ? "border-primary-soft bg-pastel-pink-soft"
                      : "border-transparent",
                    option.id === null && "text-muted-foreground",
                  )}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    className="size-4 shrink-0"
                  >
                    <path d="M2.5 6a1.5 1.5 0 0 1 1.5-1.5h3.5l1.8 2H16A1.5 1.5 0 0 1 17.5 8v7a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 15Z" />
                  </svg>
                  <span className="truncate">{option.name}</span>
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
          className="mt-3"
        />
        {error && (
          <FormMessage tone="error" className="mt-2">
            {error}
          </FormMessage>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={
            saving ||
            (!newName.trim() &&
              (target === undefined || target === currentFolderId))
          }
          onClick={() => void move()}
        >
          {saving ? "Moving…" : "Move"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
