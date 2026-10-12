"use client";

import { useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "./pixel-image";
import { PixelSpinner } from "./pixel-spinner";

type SnackbarTone =
  | "error"
  | "warning"
  | "action"
  | "undo"
  | "connection"
  | "tokens"
  | "success"
  | "loading"
  | "account";

type SnackbarOptions = {
  tone?: SnackbarTone;
  action?: { label: string; onClick: () => void };
  persistent?: boolean;
};

type SnackbarProps = SnackbarOptions & {
  message: string;
  progress?: number | null;
  closing?: boolean;
  onClose: () => void;
};

const TONES: Record<
  SnackbarTone,
  { icon: string; className: string; action: string; duration: number }
> = {
  error: {
    icon: "/art/icons/error-icon.png",
    className: "bg-error-soft text-foreground",
    action: "font-medium text-primary hover:text-primary-hover",
    duration: 2500,
  },
  warning: {
    icon: "/art/icons/warning-icon.png",
    className: "bg-attention-soft text-foreground",
    action: "font-medium text-primary hover:text-primary-hover",
    duration: 2500,
  },
  action: {
    icon: "/art/icons/action-icon.png",
    className: "bg-success-soft text-foreground",
    action: "font-medium text-primary hover:text-primary-hover",
    duration: 2500,
  },
  undo: {
    icon: "/art/icons/undo-icon.png",
    className: "bg-undo-surface text-pastel-pink-soft",
    action: "font-semibold text-pastel-pink-soft hover:text-white",
    duration: 4000,
  },
  connection: {
    icon: "/art/icons/connection-icon.png",
    className: "bg-error-soft text-foreground",
    action: "font-medium text-primary hover:text-primary-hover",
    duration: 2500,
  },
  success: {
    icon: "/art/icons/success-icon.png",
    className: "bg-success-soft text-foreground",
    action: "font-medium text-primary hover:text-primary-hover",
    duration: 2500,
  },
  tokens: {
    icon: "/art/icons/action-icon.png",
    className: "bg-attention-soft text-foreground",
    action: "font-medium text-primary hover:text-primary-hover",
    duration: 4000,
  },
  account: {
    icon: "/art/icons/account-icon.png",
    className: "bg-account-soft text-foreground",
    action: "font-medium text-primary hover:text-primary-hover",
    duration: 4000,
  },
  loading: {
    icon: "",
    className: "bg-undo-surface text-pastel-pink-soft",
    action: "font-semibold text-pastel-pink-soft hover:text-white",
    duration: 0,
  },
};

export const LINK_COPIED = "Link copied to clipboard!";

const icons = new Map<string, string>();

export function preloadSnackbarIcons() {
  for (const { icon } of Object.values(TONES)) {
    if (!icon || icons.has(icon)) continue;
    icons.set(icon, icon);
    void fetch(icon)
      .then((response) => response.blob())
      .then((blob) => icons.set(icon, URL.createObjectURL(blob)))
      .catch(() => icons.delete(icon));
  }
}

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let shown = 0;

function render(key: number, props: Omit<SnackbarProps, "onClose">) {
  if (!host || !root) {
    host = document.createElement("div");
    host.popover = "manual";
    host.className =
      "m-0 size-0 overflow-visible border-0 bg-transparent p-0 inset-auto";
    document.body.append(host);
    root = createRoot(host);
  }
  root.render(
    <Snackbar
      key={key}
      {...props}
      onClose={() => {
        if (key !== shown) return;
        root?.render(null);
        host?.hidePopover();
      }}
    />,
  );
}

export function showSnackbar(message: string, options: SnackbarOptions = {}) {
  const key = ++shown;
  render(key, { message, ...options });
  if (host?.matches(":popover-open")) host.hidePopover();
  host?.showPopover();
  return key;
}

export function showSuccess(message: string) {
  showSnackbar(message, { tone: "success" });
}

export function showUndo(message: string, onUndo: () => void) {
  showSnackbar(message, {
    tone: "undo",
    action: { label: "Undo", onClick: onUndo },
  });
}

export function showLoading(message: string) {
  const options = { message, tone: "loading", persistent: true } as const;
  const key = showSnackbar(message, options);
  return {
    progress: (value: number) => {
      if (key === shown) render(key, { ...options, progress: value });
    },
    close: () => {
      if (key === shown) render(key, { ...options, closing: true });
    },
  };
}

export async function withLoading<T>(
  message: string,
  task: () => Promise<T>,
): Promise<T> {
  const loading = showLoading(message);
  try {
    return await task();
  } finally {
    loading.close();
  }
}

export function Snackbar({
  message,
  tone = "error",
  action,
  persistent,
  progress,
  closing,
  onClose,
}: SnackbarProps) {
  const [leaving, setLeaving] = useState(false);
  const { duration } = TONES[tone];
  const gone = leaving || closing;

  useEffect(() => {
    if (persistent) return;
    const timer = window.setTimeout(() => setLeaving(true), duration);
    return () => window.clearTimeout(timer);
  }, [duration, persistent]);

  const act = () => {
    if (gone || !action) return;
    action.onClick();
    setLeaving(true);
  };

  const icon =
    tone === "loading" ? (
      <PixelSpinner className="text-progress-fill" />
    ) : (
      <PixelImage
        src={icons.get(TONES[tone].icon) ?? TONES[tone].icon}
        alt=""
        width={24}
        height={24}
        className="size-6 shrink-0"
      />
    );

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-4">
      <div
        role={tone === "error" ? "alert" : "status"}
        onAnimationEnd={(e) => {
          if (gone && e.target === e.currentTarget) onClose();
        }}
        className={cn(
          "pointer-events-auto flex min-h-14 w-90 max-w-full flex-col justify-center gap-3 rounded-xl p-4 text-sm shadow-lg",
          TONES[tone].className,
          gone
            ? "animate-out fade-out slide-out-to-top-2 fill-mode-forwards duration-300"
            : "animate-in fade-in slide-in-from-top-2 duration-300",
        )}
      >
        <div className="flex items-center gap-3">
          {tone === "undo" && action ? (
            <button
              type="button"
              aria-label={action.label}
              onClick={act}
              className="shrink-0"
            >
              {icon}
            </button>
          ) : (
            icon
          )}
          <p className="flex-1">{message}</p>
          {action && (
            <button
              type="button"
              onClick={act}
              className={cn("shrink-0", TONES[tone].action)}
            >
              {action.label}
            </button>
          )}
        </div>
        {tone === "loading" && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              progress == null ? undefined : Math.round(progress * 100)
            }
            className="h-1 overflow-hidden rounded-full bg-progress-track"
          >
            <div
              className={cn(
                "h-full w-0 rounded-full bg-progress-fill transition-[width] duration-300",
                progress == null &&
                  !closing &&
                  "animate-[loading-fill_12s_cubic-bezier(0.1,0.7,0.3,1)_forwards]",
              )}
              style={
                closing
                  ? { width: "100%" }
                  : progress != null
                    ? { width: `${Math.min(1, progress) * 100}%` }
                    : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
