"use client";

import { useState } from "react";
import { Checkbox } from "@pigxel/ui/components/choice";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import {
  MAX_TWEEN_FRAMES,
  TWEEN_EASES,
  tweenOffsets,
  type TweenEase,
} from "@/lib/sprite/tween";
import { EditorSelect } from "./editor-select";
import { SIZE_LABEL, SizeField } from "./size-controls";

type TweenProps = {
  onApply: (offsets: { x: number; y: number }[]) => void;
};

export default function TweenDialog({
  onClose,
  ...props
}: TweenProps & { onClose: () => void }) {
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <TweenForm {...props} />
    </Dialog>
  );
}

const whole = (text: string) => Math.round(Number(text)) || 0;

function TweenForm({ onApply }: TweenProps) {
  const { close } = useDialog();
  const [dx, setDx] = useState("8");
  const [dy, setDy] = useState("0");
  const [between, setBetween] = useState("3");
  const [ease, setEase] = useState<TweenEase>("linear");
  const [withEnd, setWithEnd] = useState(true);
  const x = whole(dx);
  const y = whole(dy);
  const steps = Math.min(MAX_TWEEN_FRAMES, Math.max(1, whole(between)));
  const count = steps + (withEnd ? 1 : 0);
  const moves = x !== 0 || y !== 0;

  return (
    <form
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!moves) return;
        onApply(tweenOffsets(x, y, steps, ease, withEnd));
        close();
      }}
    >
      <ModalHeader title="Tween the Selection" />
      <DialogBody className="grid gap-5 py-5">
        <div className="grid grid-cols-2 gap-4">
          <SizeField
            id="tween-x"
            label="Move right"
            unit="px"
            min={null}
            value={dx}
            onChange={setDx}
          />
          <SizeField
            id="tween-y"
            label="Move down"
            unit="px"
            min={null}
            value={dy}
            onChange={setDy}
          />
          <SizeField
            id="tween-frames"
            label="Frames in between"
            unit="frames"
            value={between}
            onChange={setBetween}
          />
          <div>
            <span className={SIZE_LABEL}>Motion</span>
            <EditorSelect
              ariaLabel="Motion"
              value={ease}
              onChange={(value) => setEase(value as TweenEase)}
              options={TWEEN_EASES.map(({ value, label }) => ({
                value,
                label,
              }))}
              className="h-14 w-full rounded-xl px-4 text-base"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={withEnd}
            onChange={(e) => setWithEnd(e.target.checked)}
          />
          Also add the last frame, with the piece at the end
        </label>
        <p
          className={cn(
            "rounded-xl px-4 py-3 text-sm tabular-nums",
            moves ? "bg-success-soft" : "bg-attention-soft",
          )}
        >
          {moves
            ? `Adds ${count} ${count === 1 ? "frame" : "frames"}. Use negative numbers to move left or up.`
            : "Set how far the piece moves."}
        </p>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={!moves}>
          Add frames
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
