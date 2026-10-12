"use client";

import { Button } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@pigxel/ui/components/dialog";

export function ConflictDialog({
  name,
  busy,
  onKeepMine,
  onTakeTheirs,
}: {
  name: string;
  busy: boolean;
  onKeepMine: () => void;
  onTakeTheirs: () => void;
}) {
  return (
    <Dialog onClose={() => {}} dismissible={false} size="sm" portal>
      <DialogHeader
        title="Which version do you want to keep?"
        description={`“${name}” was changed on another device or tab since you opened it here.`}
      />
      <DialogBody className="grid gap-2 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Keep this version</span>{" "}
          saves what you see here over the other changes.
        </p>
        <p>
          <span className="font-medium text-foreground">
            Use the other version
          </span>{" "}
          opens the newer copy from Pigxel cloud. Your changes here are dropped.
        </p>
      </DialogBody>
      <DialogFooter>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onTakeTheirs}
        >
          Use the other version
        </Button>
        <Button type="button" disabled={busy} onClick={onKeepMine}>
          Keep this version
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
