"use client";

import { useEffect, useRef, useState } from "react";
import {
  PIGXEL_EXTENSION,
  stripPigxelExtension,
} from "@/lib/pigxel-file/format";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import {
  Lead,
  SectionTitle,
  textLinkClassName,
} from "@pigxel/ui/components/typography";
import type { FileItem, Listing } from "../constants";

export function FilesDialog({
  title,
  subtitle,
  empty,
  load,
  errorAction,
  onPick,
  onClose,
}: {
  title: string;
  subtitle?: string | null;
  empty: string;
  load: () => Promise<FileItem[]>;
  errorAction?: (error: unknown) => { label: string; href: string } | null;
  onPick: (item: FileItem) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [listing, setListing] = useState<Listing>({ state: "loading" });
  const [failure, setFailure] = useState<unknown>(null);

  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    load().then(
      (items) => active && setListing({ state: "ready", items }),
      (error) => {
        if (!active) return;
        setFailure(error);
        setListing({
          state: "error",
          message:
            error instanceof Error
              ? error.message
              : "Couldn’t list your files.",
        });
      },
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fix = listing.state === "error" ? errorAction?.(failure) : null;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="files-dialog-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <SectionTitle id="files-dialog-title">{title}</SectionTitle>
          {subtitle && <Lead className="mt-1">{subtitle}</Lead>}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={() => dialog.current?.close()}
          className="text-lg leading-none"
        >
          ×
        </Button>
      </div>

      <div className="max-h-96 overflow-y-auto p-2">
        {listing.state === "loading" && (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        )}
        {listing.state === "error" && (
          <div className="p-4 text-sm">
            <FormMessage tone="error">{listing.message}</FormMessage>
            {fix && (
              <a
                href={fix.href}
                className={`mt-3 inline-block ${textLinkClassName}`}
              >
                {fix.label}
              </a>
            )}
          </div>
        )}
        {listing.state === "ready" && listing.items.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">{empty}</p>
        )}
        {listing.state === "ready" &&
          listing.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                dialog.current?.close();
                onPick(item);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
            >
              {item.thumbnail !== undefined && (
                <span className="flex size-10 shrink-0 items-center justify-center rounded border bg-checker">
                  {item.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element -- a tiny data URL
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="max-h-full max-w-full [image-rendering:pixelated]"
                    />
                  )}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm">
                {stripPigxelExtension(item.name)}
                <span className="text-muted-foreground">
                  {PIGXEL_EXTENSION}
                </span>
              </span>
              {item.modified && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(item.modified).toLocaleString()}
                </span>
              )}
            </button>
          ))}
      </div>
    </dialog>
  );
}
