"use client";

import { useEffect, useState } from "react";
import {
  PIGXEL_EXTENSION,
  stripPigxelExtension,
} from "@/lib/pigxel-file/format";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { textLinkClassName } from "@pigxel/ui/components/typography";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { PixelImage } from "@/components/ui/pixel-image";
import type { FileItem, Listing } from "../constants";

type FilesProps = {
  title: string;
  subtitle?: string | null;
  empty: string;
  load: () => Promise<FileItem[]>;
  errorAction?: (error: unknown) => { label: string; href: string } | null;
  onPick: (item: FileItem) => void;
};

export function FilesDialog({
  onClose,
  ...props
}: FilesProps & { onClose: () => void }) {
  return (
    <Dialog onClose={onClose} size="md" portal>
      <FilesList {...props} />
    </Dialog>
  );
}

function FilesList({
  title,
  subtitle,
  empty,
  load,
  errorAction,
  onPick,
}: FilesProps) {
  const { close } = useDialog();
  const [listing, setListing] = useState<Listing>({ state: "loading" });
  const [failure, setFailure] = useState<unknown>(null);

  useEffect(() => {
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
    <>
      <ModalHeader title={title} />
      <DialogBody className="grid gap-4 py-5">
        {subtitle && (
          <p className="-mb-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
        {listing.state === "loading" && (
          <p className="rounded-xl border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        )}
        {listing.state === "error" && (
          <div className="rounded-xl bg-error-soft px-4 py-3 text-sm">
            <FormMessage tone="error">{listing.message}</FormMessage>
            {fix && (
              <a
                href={fix.href}
                className={`mt-2 inline-block ${textLinkClassName}`}
              >
                {fix.label}
              </a>
            )}
          </div>
        )}
        {listing.state === "ready" && listing.items.length === 0 && (
          <p className="rounded-xl border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        )}
        {listing.state === "ready" && listing.items.length > 0 && (
          <ul className="grid max-h-96 gap-1 overflow-y-auto rounded-xl border bg-background p-2">
            {listing.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onPick(item);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60"
                >
                  {item.thumbnail !== undefined && (
                    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-checker">
                      {item.thumbnail && (
                        <PixelImage
                          src={item.thumbnail}
                          alt=""
                          className="max-h-full max-w-full"
                        />
                      )}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {stripPigxelExtension(item.name)}
                      <span className="font-normal text-muted-foreground">
                        {PIGXEL_EXTENSION}
                      </span>
                    </span>
                    {item.modified && (
                      <span className="block text-[11px] text-muted-foreground">
                        Edited {new Date(item.modified).toLocaleString()}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Close
        </ModalButton>
      </DialogFooter>
    </>
  );
}
