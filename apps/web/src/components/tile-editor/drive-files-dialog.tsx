"use client";

import { useEffect, useRef, useState } from "react";
import { connectDriveUrl } from "@/lib/google-drive/status";
import {
  PIGXEL_EXTENSION,
  stripPigxelExtension,
} from "@/lib/pigxel-file/format";
import {
  DriveError,
  listDriveFiles,
  type DriveFile,
} from "@/lib/pigxel-file/google-drive";

type Listing =
  | { state: "loading" }
  | { state: "ready"; files: DriveFile[] }
  | { state: "error"; message: string; connect: boolean };

/** Pigxel files in the person's Google Drive, to pick one to open. */
export function DriveFilesDialog({
  email,
  onPick,
  onClose,
}: {
  email: string | null;
  onPick: (file: DriveFile) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [listing, setListing] = useState<Listing>({ state: "loading" });

  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    listDriveFiles().then(
      (files) => active && setListing({ state: "ready", files }),
      (error) =>
        active &&
        setListing({
          state: "error",
          message:
            error instanceof DriveError
              ? error.message
              : "Couldn’t list your Google Drive files.",
          connect: error instanceof DriveError && error.needsConnect,
        }),
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="drive-files-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <h2 id="drive-files-title" className="font-semibold">
            Open from Google Drive
          </h2>
          {email && (
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={() => dialog.current?.close()}
          className="rounded-md px-2 text-lg leading-none text-muted-foreground hover:bg-muted"
        >
          ×
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto p-2">
        {listing.state === "loading" && (
          <p className="p-4 text-sm text-muted-foreground">
            Loading your files…
          </p>
        )}
        {listing.state === "error" && (
          <div className="p-4 text-sm">
            <p role="alert" className="text-destructive">
              {listing.message}
            </p>
            {listing.connect && (
              <a
                href={connectDriveUrl("/tiles/edit")}
                className="mt-3 inline-block font-medium underline underline-offset-4"
              >
                Connect Google Drive
              </a>
            )}
          </div>
        )}
        {listing.state === "ready" && listing.files.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            No Pigxel files in your Google Drive yet. Tiles you save there
            appear here. To open a file uploaded to Drive yourself, download it
            and open it from your computer.
          </p>
        )}
        {listing.state === "ready" &&
          listing.files.map((file) => (
            <button
              key={file.id}
              type="button"
              onClick={() => {
                dialog.current?.close();
                onPick(file);
              }}
              className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-2.5 text-left hover:bg-muted"
            >
              <span className="truncate text-sm">
                {stripPigxelExtension(file.name)}
                <span className="text-muted-foreground">
                  {PIGXEL_EXTENSION}
                </span>
              </span>
              {file.modifiedTime && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(file.modifiedTime).toLocaleString()}
                </span>
              )}
            </button>
          ))}
      </div>
    </dialog>
  );
}
