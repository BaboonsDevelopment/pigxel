"use client";

import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@pigxel/ui/components/dialog";
import { Field } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { MAX_SELECTION_NAME } from "@/lib/selections/saved";

export default function SaveSelectionDialog({
  defaultName,
  onSave,
  onClose,
}: {
  defaultName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const trimmed = name.trim();

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed) return;
          onSave(trimmed);
          onClose();
        }}
      >
        <DialogHeader
          title="Save selection"
          description="It’s kept with the tile, so you can load it again any time."
        />
        <DialogBody>
          <Field label="Name" htmlFor="selection-name">
            <Input
              id="selection-name"
              autoFocus
              value={name}
              maxLength={MAX_SELECTION_NAME}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!trimmed}>
            Save
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
