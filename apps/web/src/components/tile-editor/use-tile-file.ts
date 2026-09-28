"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { PenSettings } from "@/components/pixel-canvas/pen";
import type { PixelCanvasHandle } from "@/components/pixel-canvas/pixel-canvas";
import {
  canStoreDrafts,
  writeDraft,
  type Draft,
} from "@/lib/pigxel-file/draft";
import {
  PigxelFileError,
  parsePigxel,
  pigxelFileName,
  serializePigxel,
  stripPigxelExtension,
  type Background,
} from "@/lib/pigxel-file/format";
import type { DriveStatus } from "@/lib/google-drive/status";
import {
  DriveError,
  readDriveFile,
  saveDriveFile,
  type DriveFile,
} from "@/lib/pigxel-file/google-drive";
import { downloadPigxel } from "@/lib/pigxel-file/local";

export type FileStatus = {
  tone: "info" | "error";
  text: string;
  /** Label of a button that saves to Google Drive again. */
  retry?: string;
  /** The Google account must be connected again before Drive saves work. */
  connect?: boolean;
};

type DriveSync = "idle" | "saving" | "saved" | "failed";

/** How long editing must pause before the tile autosaves to Google Drive. */
const DRIVE_AUTOSAVE_DELAY = 1500;

/**
 * Opening and saving the tile as a .pigxel file, on the computer or in Google
 * Drive. Every change is kept as a browser draft, and a tile that lives in
 * Google Drive autosaves there too.
 */
export function useTileFile({
  canvas,
  fileInput,
  userId,
  initial,
  initialBackground,
  pen,
  drive,
  notice,
}: {
  canvas: RefObject<PixelCanvasHandle | null>;
  fileInput: RefObject<HTMLInputElement | null>;
  userId: string;
  /** The draft restored when the editor opened. */
  initial: Draft;
  initialBackground: Background;
  pen: PenSettings;
  drive: DriveStatus;
  /** A message to show when the editor opens. */
  notice?: FileStatus;
}) {
  const [name, setName] = useState(initial.name);
  const [background, setBackground] = useState(initialBackground);
  const [driveFile, setDriveFile] = useState<DriveFile | null>(
    initial.driveFile,
  );
  const [dirty, setDirty] = useState(initial.dirty);
  // Bumped on every change, so the draft and Drive copy are saved again.
  const [revision, setRevision] = useState(0);
  const latestRevision = useRef(revision);
  const [driveSync, setDriveSync] = useState<DriveSync>(
    initial.driveFile && !initial.dirty ? "saved" : "idle",
  );
  const [driveError, setDriveError] = useState<DriveError | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<FileStatus | null>(() =>
    canStoreDrafts()
      ? (notice ?? null)
      : {
          tone: "error",
          text: "This browser won’t keep your tile between pages. Save it to keep it.",
        },
  );
  const driveEnabled = drive.available;

  useEffect(() => {
    latestRevision.current = revision;
    const image = canvas.current?.getImage();
    if (!image) return;
    const file = serializePigxel(image);
    writeDraft(userId, { name, file, driveFile, dirty, pen });
  }, [canvas, userId, name, driveFile, dirty, pen, revision]);

  const contents = () => {
    const image = canvas.current?.getImage();
    if (!image) throw new PigxelFileError("The tile isn’t ready yet.");
    return serializePigxel(image);
  };

  // A tile in Google Drive saves itself once editing pauses. If the Google
  // account isn't connected any more, it stops and asks to connect.
  useEffect(() => {
    if (!driveEnabled || !driveFile || !dirty) return;
    if (driveSync === "saving" || driveSync === "failed") return;
    const timer = setTimeout(async () => {
      const savedRevision = latestRevision.current;
      setDriveSync("saving");
      try {
        const saved = await saveDriveFile(
          { id: driveFile.id, name },
          contents(),
        );
        setDriveFile(saved);
        setDriveError(null);
        setDriveSync("saved");
        // Edits made while saving stay unsaved for the next round.
        if (latestRevision.current === savedRevision) setDirty(false);
      } catch (error) {
        setDriveError(
          error instanceof DriveError
            ? error
            : new DriveError("Couldn’t save to Google Drive."),
        );
        setDriveSync("failed");
      }
    }, DRIVE_AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
    // `contents` reads the canvas at save time, so it isn't a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driveEnabled, driveFile, dirty, name, revision, driveSync]);

  const changed = () => {
    setDirty(true);
    setRevision((r) => r + 1);
  };

  const confirmDiscard = () =>
    !dirty || window.confirm("Discard your unsaved changes to this tile?");

  const load = (
    text: string,
    fileName: string,
    fromDrive: DriveFile | null,
  ) => {
    const image = parsePigxel(text);
    canvas.current?.setImage(image);
    setBackground(image.background ?? "transparent");
    setName(stripPigxelExtension(fileName));
    setDriveFile(fromDrive);
    setDriveSync(fromDrive ? "saved" : "idle");
    setDriveError(null);
    setDirty(false);
    setRevision((r) => r + 1);
    setStatus({ tone: "info", text: `Opened ${pigxelFileName(fileName)}` });
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setStatus(null);
    try {
      await action();
    } catch (error) {
      setStatus({
        tone: "error",
        text:
          error instanceof PigxelFileError || error instanceof DriveError
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const openFromComputer = () => {
    if (confirmDiscard()) fileInput.current?.click();
  };

  const onFileChosen = (file: File | undefined) => {
    if (file) void run(async () => load(await file.text(), file.name, null));
  };

  /** Opens a file chosen from the Drive file list; ask confirmDiscard() first. */
  const openDriveFile = (picked: DriveFile) =>
    void run(async () =>
      load(await readDriveFile(picked.id), picked.name, picked),
    );

  const download = () =>
    void run(async () => {
      downloadPigxel(name, contents());
      if (!driveFile) setDirty(false);
      setStatus({ tone: "info", text: `Downloaded ${pigxelFileName(name)}` });
    });

  const saveToDrive = () =>
    void run(async () => {
      const savedRevision = latestRevision.current;
      setDriveSync("saving");
      try {
        const saved = await saveDriveFile(
          { id: driveFile?.id, name },
          contents(),
        );
        setDriveFile(saved);
        setDriveError(null);
        setDriveSync("saved");
        if (latestRevision.current === savedRevision) setDirty(false);
      } catch (error) {
        setDriveSync(driveFile ? "failed" : "idle");
        throw error;
      }
    });

  /** Ctrl/⌘+S saves back to where the tile lives. */
  const save = () => (driveFile && driveEnabled ? saveToDrive() : download());

  // A tile in Drive shows its autosave state; anything else shows the last action.
  const driveStatus: FileStatus | null =
    !driveFile || !driveEnabled
      ? null
      : driveSync === "failed"
        ? {
            tone: "error",
            text: driveError?.message ?? "Couldn’t save to Google Drive.",
            retry: driveError?.needsConnect
              ? "Connect Google Drive"
              : "Try again",
            connect: driveError?.needsConnect,
          }
        : driveSync === "saving"
          ? { tone: "info", text: "Saving to Google Drive…" }
          : dirty
            ? { tone: "info", text: "Changes not yet in Google Drive" }
            : { tone: "info", text: "All changes saved to Google Drive" };

  return {
    name,
    rename: (next: string) => {
      setName(next);
      changed();
    },
    background,
    driveFile,
    driveEnabled,
    dirty,
    markDirty: changed,
    busy,
    status:
      driveSync === "failed" || status?.tone !== "error"
        ? (driveStatus ?? status)
        : status,
    onFileChosen,
    confirmDiscard,
    openFromComputer,
    openDriveFile,
    download,
    saveToDrive,
    save,
  };
}
