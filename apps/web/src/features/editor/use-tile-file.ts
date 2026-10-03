"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
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
  type PigxelDocument,
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
  draftFromDocument,
  draftFromFile,
} from "@/lib/pigxel-file/open-tile";
import {
  documentFromImage,
  documentFromSequence,
  imageBaseName,
  isImageFile,
  sequenceName,
} from "@/lib/pigxel-file/import-image";
import { thumbnailDataUrl } from "@/lib/pigxel-file/thumbnail";

type FileStatus = {
  tone: "info" | "error";
  text: string;
  retry?: string;
  connect?: boolean;
};

export type TileFile = ReturnType<typeof useTileFile>;

type Sync = "idle" | "saving" | "saved" | "failed";

const AUTOSAVE_DELAY = 1500;

const isKnownError = (error: unknown): error is Error =>
  error instanceof PigxelFileError ||
  error instanceof DriveError ||
  error instanceof CloudError;

export function useTileFile({
  tile,
  fileInput,
  userId,
  initial,
  drive,
  notice,
  onOpen,
}: {
  tile: RefObject<{ document: () => PigxelDocument } | null>;
  fileInput: RefObject<HTMLInputElement | null>;
  userId: string;
  initial: Draft;
  drive: DriveStatus;
  notice?: FileStatus;
  onOpen: (draftId: string) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [location, setLocation] = useState<TileLocation | null>(
    initial.location,
  );
  const [dirty, setDirty] = useState(initial.dirty);
  const [revision, setRevision] = useState(0);
  const latestRevision = useRef(revision);
  const [sync, setSync] = useState<Sync>(
    initial.location && !initial.dirty ? "saved" : "idle",
  );
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<FileStatus | null>(() =>
    canStoreDrafts(userId)
      ? (notice ?? null)
      : {
          tone: "error",
          text: "This browser won’t keep your tile between pages. Save it to keep it.",
        },
  );

  useEffect(() => {
    latestRevision.current = revision;
    const doc = tile.current?.document();
    if (!doc) return;
    const file = serializePigxel(doc);
    writeDraft(userId, { id: initial.id, name, file, location, dirty });
  }, [tile, userId, initial.id, name, location, dirty, revision]);

  const currentImage = () => {
    const doc = tile.current?.document();
    if (!doc) throw new PigxelFileError("The tile isn’t ready yet.");
    return doc;
  };

  const saveTo = async (
    target: TileLocation["kind"],
    current: TileLocation | null,
    image = currentImage(),
    tileName = name,
  ): Promise<TileLocation> => {
    const contents = serializePigxel(image);
    if (target === "cloud") {
      const tile: CloudTile = await saveCloudTile(
        {
          id: current?.kind === "cloud" ? current.tile.id : undefined,
          name: tileName,
        },
        contents,
        image,
        thumbnailDataUrl(image),
      );
      return { kind: "cloud", tile };
    }
    const file: DriveFile = await saveDriveFile(
      {
        id: current?.kind === "drive" ? current.file.id : undefined,
        name: tileName,
      },
      contents,
    );
    return { kind: "drive", file };
  };

  const saved = (next: TileLocation, savedRevision: number) => {
    setLocation(next);
    setSyncError(null);
    setSync("saved");
    if (latestRevision.current === savedRevision) setDirty(false);
  };

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

  const openNew = async (doc: PigxelDocument, tileName: string) => {
    let home: TileLocation | null = null;
    if (location && (location.kind === "cloud" || drive.available))
      try {
        home = await saveTo(location.kind, null, doc, tileName);
      } catch {}
    onOpen(await draftFromDocument(userId, doc, tileName, home));
  };

  const onFileChosen = (file: File | undefined) => {
    if (!file) return;
    void run(async () =>
      isImageFile(file)
        ? openNew(await documentFromImage(file), imageBaseName(file.name))
        : onOpen(
            await draftFromFile(userId, await file.text(), file.name, null),
          ),
    );
  };

  const openFrames = (files: File[]) => {
    if (!files.length) return;
    void run(async () =>
      openNew(
        await documentFromSequence(files),
        sequenceName(files.map((f) => f.name)),
      ),
    );
  };

  const openDocument = (doc: PigxelDocument, tileName: string) =>
    void run(() => openNew(doc, tileName));

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

  const save = () => (location ? saveNow(location.kind) : download());

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
    revision,
    rename: (next: string) => {
      setName(next);
      changed();
    },
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
    openDocument,
    openFrames,
    openDriveFile,
    openCloudTile,
    download,
    saveToCloud: () => saveNow("cloud"),
    saveToDrive: () => saveNow("drive"),
    save,
  };
}
