"use client";

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@pigxel/ui/components/button";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
};

/** Asks in a modal instead of the browser's confirm(); resolves to the answer. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  return new Promise((resolve) => {
    root.render(
      <ConfirmDialog
        {...options}
        onDone={(confirmed) => {
          resolve(confirmed);
          root.unmount();
          host.remove();
        }}
      />,
    );
  });
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onDone,
}: ConfirmOptions & { onDone: (confirmed: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const confirmed = useRef(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const close = (answer: boolean) => {
    confirmed.current = answer;
    dialog.current?.close();
  };

  return (
    <dialog
      ref={dialog}
      onClose={() => onDone(confirmed.current)}
      onClick={(e) => {
        // A click on the dimmed backdrop cancels.
        if (e.target === dialog.current) close(false);
      }}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border bg-background p-5 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <SectionTitle id="confirm-dialog-title">{title}</SectionTitle>
      <Lead id="confirm-dialog-message" className="mt-2">
        {message}
      </Lead>
      <div className="mt-5 flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          autoFocus
          onClick={() => close(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => close(true)}
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
