"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { PixelCanvasHandle } from "@/components/pixel-canvas/pixel-canvas";
import type { DriveStatus } from "@/lib/google-drive/status";
import { CloudError, saveCloudTile } from "@/lib/pigxel-file/cloud";
import {
  canStoreDrafts,
  writeDraft,
  type Draft,
} from "@/lib/pigxel-file/draft";
import {
  PigxelFileError,
  pigxelFileName,
  serializePigxel,
  type Background,
} from "@/lib/pigxel-file/format";
import {
  DriveError,
  saveDriveFile,
  type DriveFile,
} from "@/lib/pigxel-file/google-drive";
import { downloadPigxel } from "@/lib/pigxel-file/local";
import {
  LOCATION_LABELS,
  type CloudTile,
  type TileLocation,
} from "@/lib/pigxel-file/location";
import {
  draftForCloudTile,
  draftForDriveFile,
  draftFromFile,
} from "@/lib/pigxel-file/open-tile";
import { thumbnailDataUrl } from "@/lib/pigxel-file/thumbnail";

export type FileStatus = {
  tone: "info" | "error";
  text: string;
  /** Label of a button that saves to the tile's location again. */
  retry?: string;
  /** The Google account must be connected again before Drive saves work. */
  connect?: boolean;
};

type Sync = "idle" | "saving" | "saved" | "failed";

/** How long editing must pause before the tile autosaves to its location. */
const AUTOSAVE_DELAY = 1500;

const isKnownError = (error: unknown): error is Error =>
  error instanceof PigxelFileError ||
  error instanceof DriveError ||
  error instanceof CloudError;

/**
 * Saving the tile being edited and opening others: on the computer, in Pigxel
 * cloud or in Google Drive. Every change is kept in this tile's browser draft,
 * and a tile that lives in Pigxel cloud or Google Drive autosaves there too.
 * Opening a file never replaces this tile: it gets its own draft, which
 * `onOpen` shows.
 */
export function useTileFile({
  canvas,
  fileInput,
  userId,
  initial,
  initialBackground,
  drive,
  notice,
  onOpen,
}: {
  canvas: RefObject<PixelCanvasHandle | null>;
  fileInput: RefObject<HTMLInputElement | null>;
  userId: string;
  /** The draft restored when the editor opened. */
  initial: Draft;
  initialBackground: Background;
  drive: DriveStatus;
  /** A message to show when the editor opens. */
  notice?: FileStatus;
  /** Shows another tile's draft after opening it. */
  onOpen: (draftId: string) => void;
}) {
  const [name, setName] = useState(initial.name);
  const background = initialBackground;
  const [location, setLocation] = useState<TileLocation | null>(
    initial.location,
  );
  const [dirty, setDirty] = useState(initial.dirty);
  // Bumped on every change, so the draft and the saved copy are updated again.
  const [revision, setRevision] = useState(0);
  const latestRevision = useRef(revision);
  const [sync, setSync] = useState<Sync>(
    initial.location && !initial.dirty ? "saved" : "idle",
  );
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<FileStatus | null>(() =>
    canStoreDrafts()
      ? (notice ?? null)
      : {
          tone: "error",
          text: "This browser won’t keep your tile between pages. Save it to keep it.",
        },
  );

  useEffect(() => {
    latestRevision.current = revision;
    const image = canvas.current?.getImage();
    if (!image) return;
    const file = serializePigxel(image);
    writeDraft(userId, { id: initial.id, name, file, location, dirty });
  }, [canvas, userId, initial.id, name, location, dirty, revision]);

  const currentImage = () => {
    const image = canvas.current?.getImage();
    if (!image) throw new PigxelFileError("The tile isn’t ready yet.");
    return image;
  };

  /** Saves the tile to `target` (the same place, or a new one) and returns where it now lives. */
  const saveTo = async (
    target: TileLocation["kind"],
    current: TileLocation | null,
  ): Promise<TileLocation> => {
    const image = currentImage();
    const contents = serializePigxel(image);
    if (target === "cloud") {
      const tile: CloudTile = await saveCloudTile(
        { id: current?.kind === "cloud" ? current.tile.id : undefined, name },
        contents,
        image,
        thumbnailDataUrl(image),
      );
      return { kind: "cloud", tile };
    }
    const file: DriveFile = await saveDriveFile(
      { id: current?.kind === "drive" ? current.file.id : undefined, name },
      contents,
    );
    return { kind: "drive", file };
  };

  const saved = (next: TileLocation, savedRevision: number) => {
    setLocation(next);
    setSyncError(null);
    setSync("saved");
    // Edits made while saving stay unsaved for the next round.
    if (latestRevision.current === savedRevision) setDirty(false);
  };

  // A tile in Pigxel cloud or Google Drive saves itself once editing pauses.
  // After a failure it waits for "Try again" (or "Connect Google Drive").
  useEffect(() => {
    if (!location || !dirty || sync === "saving" || sync === "failed") return;
    if (location.kind === "drive" && !drive.available) return;
    const timer = setTimeout(async () => {
      const savedRevision = latestRevision.current;
      setSync("saving");
      try {
        saved(await saveTo(location.kind, location), savedRevision);
      } catch (error) {
        setSyncError(
          isKnownError(error)
            ? error
            : new Error(`Couldn’t save to ${LOCATION_LABELS[location.kind]}.`),
        );
        setSync("failed");
      }
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
    // The save helpers read the canvas and name at save time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, dirty, name, revision, sync, drive.available]);

  const changed = () => {
    setDirty(true);
    setRevision((r) => r + 1);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setStatus(null);
    try {
      await action();
    } catch (error) {
      setStatus({
        tone: "error",
        text: isKnownError(error)
          ? error.message
          : "Something went wrong. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const openFromComputer = () => fileInput.current?.click();

  const onFileChosen = (file: File | undefined) => {
    if (file)
      void run(async () =>
        onOpen(draftFromFile(userId, await file.text(), file.name, null)),
      );
  };

  const openDriveFile = (picked: DriveFile) =>
    void run(async () => onOpen(await draftForDriveFile(userId, picked)));

  const openCloudTile = (picked: CloudTile) =>
    void run(async () => onOpen(await draftForCloudTile(userId, picked)));

  const download = () =>
    void run(async () => {
      downloadPigxel(name, serializePigxel(currentImage()));
      if (!location) setDirty(false);
      setStatus({ tone: "info", text: `Downloaded ${pigxelFileName(name)}` });
    });

  /** Saves now to `target`, moving the tile there if it lived elsewhere. */
  const saveNow = (target: TileLocation["kind"]) =>
    void run(async () => {
      const savedRevision = latestRevision.current;
      setSync("saving");
      try {
        saved(await saveTo(target, location), savedRevision);
      } catch (error) {
        setSync(location ? "failed" : "idle");
        throw error;
      }
    });

  /** Ctrl/⌘+S saves back to where the tile lives. */
  const save = () => (location ? saveNow(location.kind) : download());

  // A tile with a home shows its autosave state; otherwise the last action.
  const place = location ? LOCATION_LABELS[location.kind] : null;
  const locationStatus: FileStatus | null = !place
    ? null
    : sync === "failed"
      ? {
          tone: "error",
          text: syncError?.message ?? `Couldn’t save to ${place}.`,
          retry:
            syncError instanceof DriveError && syncError.needsConnect
              ? "Connect Google Drive"
              : "Try again",
          connect: syncError instanceof DriveError && syncError.needsConnect,
        }
      : sync === "saving"
        ? { tone: "info", text: `Saving to ${place}…` }
        : dirty
          ? { tone: "info", text: `Changes not yet saved to ${place}` }
          : { tone: "info", text: `All changes saved to ${place}` };

  return {
    name,
    rename: (next: string) => {
      setName(next);
      changed();
    },
    background,
    location,
    dirty,
    markDirty: changed,
    busy,
    status:
      sync === "failed" || status?.tone !== "error"
        ? (locationStatus ?? status)
        : status,
    onFileChosen,
    openFromComputer,
    openDriveFile,
    openCloudTile,
    download,
    saveToCloud: () => saveNow("cloud"),
    saveToDrive: () => saveNow("drive"),
    save,
  };
}
