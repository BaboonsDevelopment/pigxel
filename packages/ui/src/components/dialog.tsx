"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/utils";
import { IconButton } from "./button";

export type DialogSize = "sm" | "md" | "lg" | "xl";

const widths: Record<DialogSize, string> = {
  sm: "w-[min(26rem,calc(100vw-2rem))]",
  md: "w-[min(36rem,calc(100vw-2rem))]",
  lg: "w-[min(44rem,calc(100vw-2rem))]",
  xl: "w-[min(48rem,calc(100vw-2rem))]",
};

const DialogContext = createContext<{ close: () => void; titleId?: string }>({
  close: () => {},
});

export function useDialog() {
  return useContext(DialogContext);
}

export function Dialog({
  onClose,
  size = "md",
  portal = false,
  dismissible = true,
  onCancel,
  className,
  children,
  ...props
}: Omit<ComponentProps<"dialog">, "onClose" | "open"> & {
  onClose: () => void;
  size?: DialogSize;
  portal?: boolean;
  dismissible?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const close = () => ref.current?.close();

  const dialog = (
    <dialog
      ref={ref}
      aria-labelledby={props["aria-label"] ? undefined : titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (!dismissible) e.preventDefault();
        onCancel?.(e);
      }}
      onClick={(e) => {
        if (dismissible && e.target === ref.current) close();
      }}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40 open:flex",
        widths[size],
        className,
      )}
      {...props}
    >
      <DialogContext value={{ close, titleId }}>{children}</DialogContext>
    </dialog>
  );
  if (!portal) return dialog;
  return typeof document === "undefined"
    ? null
    : createPortal(dialog, document.body);
}

export function DialogHeader({
  title,
  description,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  const { close, titleId } = useContext(DialogContext);
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-5 pt-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <IconButton
        label="Close"
        onClick={close}
        className="-mt-1 -mr-1 text-lg leading-none"
      >
        ×
      </IconButton>
    </div>
  );
}

export function DialogBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex justify-end gap-2 border-t px-5 py-3", className)}
      {...props}
    />
  );
}
