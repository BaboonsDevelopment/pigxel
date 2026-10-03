"use client";

import { useRef, type RefObject } from "react";
import { createRoot } from "react-dom/client";
import { Button, type ButtonVariant } from "@pigxel/ui/components/button";
import { Dialog, useDialog } from "@pigxel/ui/components/dialog";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
};

type DialogChoice<T extends string> = {
  value: T;
  label: string;
  variant?: ButtonVariant;
};

type ChoiceOptions<T extends string> = {
  title: string;
  message: string;
  choices: DialogChoice<T>[];
  cancelLabel?: string;
};

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
  onDone,
  ...props
}: ChoiceOptions<T> & { onDone: (answer: T | null) => void }) {
  const answer = useRef<T | null>(null);
  return (
    <Dialog
      size="sm"
      onClose={() => onDone(answer.current)}
      aria-describedby="confirm-dialog-message"
    >
      <ChoiceBody {...props} answerRef={answer} />
    </Dialog>
  );
}

function ChoiceBody<T extends string>({
  title,
  message,
  choices,
  cancelLabel = "Cancel",
  answerRef,
}: ChoiceOptions<T> & { answerRef: RefObject<T | null> }) {
  const { close, titleId } = useDialog();
  const choose = (value: T | null) => {
    answerRef.current = value;
    close();
  };
  return (
    <div className="p-5">
      <SectionTitle id={titleId}>{title}</SectionTitle>
      <Lead id="confirm-dialog-message" className="mt-2">
        {message}
      </Lead>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          autoFocus
          onClick={() => choose(null)}
        >
          {cancelLabel}
        </Button>
        {choices.map((choice) => (
          <Button
            key={choice.value}
            type="button"
            variant={choice.variant ?? "primary"}
            onClick={() => choose(choice.value)}
          >
            {choice.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
