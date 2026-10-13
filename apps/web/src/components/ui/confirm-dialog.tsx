"use client";

import { useRef, type RefObject } from "react";
import { createRoot } from "react-dom/client";
import type { ButtonVariant } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { ModalButton } from "./modal-button";
import { MODAL_FOOTER, ModalHeader } from "./modal-header";

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
      size={props.choices.length > 1 ? "md" : "sm"}
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
  const risky = choices.some((choice) => choice.variant === "destructive");
  return (
    <>
      <ModalHeader
        title={title}
        titleId={titleId}
        className={risky ? "bg-attention-soft" : undefined}
      />
      <DialogBody className="py-5">
        <p id="confirm-dialog-message" className="text-sm">
          {message}
        </p>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" autoFocus onClick={() => choose(null)}>
          {cancelLabel}
        </ModalButton>
        {choices.map((choice) => (
          <ModalButton
            key={choice.value}
            variant={choice.variant === "secondary" ? "secondary" : "primary"}
            onClick={() => choose(choice.value)}
          >
            {choice.label}
          </ModalButton>
        ))}
      </DialogFooter>
    </>
  );
}
