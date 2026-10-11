"use client";

import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Checkbox } from "@pigxel/ui/components/choice";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@pigxel/ui/components/dialog";
import {
  MAX_TWEEN_FRAMES,
  TWEEN_EASES,
  tweenOffsets,
  type TweenEase,
} from "@/lib/sprite/tween";
import { EditorSelect } from "./editor-select";
import { NumberField } from "./number-field";

export default function TweenDialog({
  onApply,
  onClose,
}: {
  onApply: (offsets: { x: number; y: number }[]) => void;
  onClose: () => void;
}) {
  const [dx, setDx] = useState(8);
  const [dy, setDy] = useState(0);
  const [between, setBetween] = useState(3);
  const [ease, setEase] = useState<TweenEase>("linear");
  const [withEnd, setWithEnd] = useState(true);
  const count = between + (withEnd ? 1 : 0);
  const moves = dx !== 0 || dy !== 0;

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          if (!moves) return;
          onApply(tweenOffsets(dx, dy, between, ease, withEnd));
          onClose();
        }}
      >
        <DialogHeader
          title="Tween the selection"
          description="Adds frames after this one where the selected piece moves step by step. Other layers are copied as they are."
        />
        <DialogBody className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              id="tween-x"
              label="Move right, px"
              value={dx}
              onChange={setDx}
            />
            <NumberField
              id="tween-y"
              label="Move down, px"
              value={dy}
              onChange={setDy}
            />
            <NumberField
              id="tween-frames"
              label="Frames in between"
              value={between}
              onChange={(n) =>
                setBetween(Math.min(MAX_TWEEN_FRAMES, Math.max(1, n)))
              }
            />
            <label className="grid gap-1 text-xs font-medium">
              Motion
              <EditorSelect
                value={ease}
                onChange={(value) => setEase(value as TweenEase)}
                options={TWEEN_EASES.map(({ value, label }) => ({
                  value,
                  label,
                }))}
                className="h-8 rounded-md border bg-background px-2 text-sm font-normal"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={withEnd}
              onChange={(e) => setWithEnd(e.target.checked)}
            />
            Also add the last frame, with the piece at the end
          </label>
          <p className="text-xs text-muted-foreground">
            {moves
              ? `Adds ${count} ${count === 1 ? "frame" : "frames"}. Use negative numbers to move left or up.`
              : "Set how far the piece moves."}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!moves}>
            Add frames
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
