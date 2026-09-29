"use client";

import { Button } from "@pigxel/ui/components/button";
import { Checkbox } from "@pigxel/ui/components/choice";
import { Textarea } from "@pigxel/ui/components/input";

type Props = {
  draft: string;
  onDraft: (text: string) => void;
  /** When on, a new picture goes into an area the user selects after sending. */
  selectArea: boolean;
  onSelectArea: (on: boolean) => void;
  pending: boolean;
  onSend: (text: string) => void;
};

export function ChatComposer({
  draft,
  onDraft,
  selectArea,
  onSelectArea,
  pending,
  onSend,
}: Props) {
  const canSend = !pending && draft.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    onSend(draft.trim());
    onDraft("");
  };

  return (
    <form
      className="flex shrink-0 flex-col gap-2 border-t p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none hover:text-foreground">
        <Checkbox
          checked={selectArea}
          onChange={(e) => onSelectArea(e.target.checked)}
        />
        Select area
      </label>
      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          aria-label="Message"
          placeholder="Ask for a change…"
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="min-h-11 flex-1"
        />
        <Button size="lg" disabled={!canSend}>
          Send
        </Button>
      </div>
    </form>
  );
}
