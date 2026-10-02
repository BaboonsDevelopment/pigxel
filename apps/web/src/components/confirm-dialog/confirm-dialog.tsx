"use client";

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Button, type ButtonVariant } from "@pigxel/ui/components/button";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
};

/** A button of a choice dialog, and the answer it gives. */
export type DialogChoice<T extends string> = {
  value: T;
  label: string;
  variant?: ButtonVariant;
};

type ChoiceOptions<T extends string> = {
  title: string;
  message: string;
  /** Shown after Cancel, in order; the last is the main one. */
  choices: DialogChoice<T>[];
  /** The label of the button that closes without an answer; "Cancel" by default. */
  cancelLabel?: string;
};

/** Asks in a modal instead of the browser's confirm(); resolves to the answer. */
export async function confirmDialog({
  confirmLabel,
  ...options
}: ConfirmOptions): Promise<boolean> {
  const answer = await choiceDialog({
    ...options,
    choices: [{ value: "yes", label: confirmLabel, variant: "destructive" }],
  });
  return answer === "yes";
}

/** Asks in a modal with several answers; resolves to the one picked, or null when cancelled. */
export function choiceDialog<T extends string>(
  options: ChoiceOptions<T>,
): Promise<T | null> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  return new Promise((resolve) => {
    root.render(
      <ChoiceDialog
        {...options}
        onDone={(answer) => {
          resolve(answer);
          root.unmount();
          host.remove();
        }}
      />,
    );
  });
}

function ChoiceDialog<T extends string>({
  title,
  message,
  choices,
  cancelLabel = "Cancel",
  onDone,
}: ChoiceOptions<T> & { onDone: (answer: T | null) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const answer = useRef<T | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const close = (value: T | null) => {
    answer.current = value;
    dialog.current?.close();
  };

  return (
    <dialog
      ref={dialog}
      onClose={() => onDone(answer.current)}
      onClick={(e) => {
        // A click on the dimmed backdrop cancels.
        if (e.target === dialog.current) close(null);
      }}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border bg-background p-5 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <SectionTitle id="confirm-dialog-title">{title}</SectionTitle>
      <Lead id="confirm-dialog-message" className="mt-2">
        {message}
      </Lead>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          autoFocus
          onClick={() => close(null)}
        >
          {cancelLabel}
        </Button>
        {choices.map((choice) => (
          <Button
            key={choice.value}
            type="button"
            variant={choice.variant ?? "primary"}
            onClick={() => close(choice.value)}
          >
            {choice.label}
          </Button>
        ))}
      </div>
    </dialog>
  );
}
