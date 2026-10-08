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
import { PROJECT_NAME_MAX } from "../../../constants";

export function RenameDialog({
  name: current,
  onRename,
  onClose,
}: {
  name: string;
  onRename: (name: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [name, setName] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const unchanged = name.trim() === current;

  const save = async () => {
    if (unchanged) return onClose();
    setSaving(true);
    setError(null);
    const failed = await onRename(name.trim());
    setSaving(false);
    if (failed) setError(failed);
    else onClose();
  };

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <DialogHeader title="Rename project" />
        <DialogBody>
          <Input
            autoFocus
            aria-label="Project name"
            maxLength={PROJECT_NAME_MAX}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
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
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Rename"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
