"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  CloudConflictError,
  CloudError,
  readCloudTileVersion,
  saveCloudTile,
} from "@/lib/pigxel-file/cloud";
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
import { downloadPigxel } from "@/lib/pigxel-file/local";
import {
  CLOUD_LABEL,
  type CloudTile,
  type TileLocation,
} from "@/lib/pigxel-file/location";
import {
  draftForCloudTile,
  draftFromDocument,
  draftFromFile,
} from "@/lib/pigxel-file/open-tile";
import {
  croppedAnimation,
  documentFromFrames,
  documentFromSequence,
  fitted,
  imageBaseName,
  isImageFile,
  isSupportedFile,
  pictureFromFile,
  sequenceName,
  tooLarge,
  UNSUPPORTED_FILE,
} from "@/lib/pigxel-file/import-image";
import type { DecodedAnimation } from "@/lib/image/gif-decode";
import { thumbnailDataUrl } from "@/lib/pigxel-file/thumbnail";
import { snapshotVersion } from "@/features/versions/actions";
import { VERSION_EVERY_MS } from "@/features/versions/versions";
import {
  showSnackbar,
  showSuccess,
  withLoading,
} from "@/components/ui/snackbar";

type FileStatus = {
  tone: "info" | "error";
  text: string;
  retry?: string;
};

export type TileFile = ReturnType<typeof useTileFile>;

type Sync = "idle" | "saving" | "saved" | "retrying" | "failed" | "conflict";

const AUTOSAVE_DELAY = 1500;
const RETRY_DELAY = 3000;
const AUTO_RETRIES = 3;
const SAVE_FAILED = "Failed to save project.";
const PROJECT_SAVED = "Project saved successfully!";
const SAVING = "Saving project…";

const isKnownError = (error: unknown): error is Error =>
  error instanceof PigxelFileError || error instanceof CloudError;

export function useTileFile({
  tile,
  fileInput,
  userId,
  initial,
  notice,
  onOpen,
  onDraft,
}: {
  tile: RefObject<{ document: () => PigxelDocument } | null>;
  onDraft?: (file: string) => void;
  fileInput: RefObject<HTMLInputElement | null>;
  userId: string;
  initial: Draft;
  notice?: FileStatus;
  onOpen: (draftId: string) => void;
}) {
  const [name, setName] = useState(initial.name);
  const onDraftRef = useRef(onDraft);
  useLayoutEffect(() => {
    onDraftRef.current = onDraft;
  });
  const [location, setLocation] = useState<TileLocation | null>(
    initial.location,
  );
  const [dirty, setDirty] = useState(initial.dirty);
  const [revision, setRevision] = useState(0);
  const latestRevision = useRef(revision);
  const lastSnapshot = useRef(0);
  const [sync, setSync] = useState<Sync>(
    initial.location && !initial.dirty ? "saved" : "idle",
  );
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [largePicture, setLargePicture] = useState<{
    picture: DecodedAnimation;
    name: string;
  } | null>(null);
  const [pause, setPause] = useState<string | null>(null);
  const [status, setStatus] = useState<FileStatus | null>(() =>
    canStoreDrafts(userId)
      ? (notice ?? null)
      : {
          tone: "error",
          text: "This browser won’t keep your tile between pages. Save it to keep it.",
        },
  );

  useEffect(() => {
    if (!canStoreDrafts(userId))
      showSnackbar("Unsaved changes will be lost.", { tone: "warning" });
  }, [userId]);

  useEffect(() => {
    latestRevision.current = revision;
    const doc = tile.current?.document();
    if (!doc) return;
    const file = serializePigxel(doc);
    writeDraft(userId, { id: initial.id, name, file, location, dirty });
    onDraftRef.current?.(file);
  }, [tile, userId, initial.id, name, location, dirty, revision]);

  const currentImage = () => {
    const doc = tile.current?.document();
    if (!doc) throw new PigxelFileError("The tile isn’t ready yet.");
    return doc;
  };

  /** Saves to Pigxel cloud: over `current`, or as a new tile when null. */
  const saveTo = async (
    current: TileLocation | null,
    image = currentImage(),
    tileName = name,
    force = false,
  ): Promise<TileLocation> => {
    if (current && Date.now() - lastSnapshot.current > VERSION_EVERY_MS) {
      if (await snapshotVersion(current.tile.id).catch(() => false))
        lastSnapshot.current = Date.now();
    }
    const tile: CloudTile = await saveCloudTile(
      {
        id: current?.tile.id,
        name: tileName,
        version: current && !force ? current.tile.version : undefined,
      },
      serializePigxel(image),
      image,
      thumbnailDataUrl(image),
    );
    return { kind: "cloud", tile };
  };

  const [failures, setFailures] = useState(0);

  const saved = (next: TileLocation, savedRevision: number) => {
    setLocation(next);
    setSyncError(null);
    setFailures(0);
    setSync("saved");
    if (latestRevision.current === savedRevision) setDirty(false);
  };

  useEffect(() => {
    if (
      !location ||
      !dirty ||
      sync === "saving" ||
      sync === "failed" ||
      sync === "conflict"
    )
      return;
    if (pause) return;
    const timer = setTimeout(
      async () => {
        const savedRevision = latestRevision.current;
        setSync("saving");
        try {
          saved(await saveTo(location), savedRevision);
        } catch (error) {
          if (error instanceof CloudConflictError) return setSync("conflict");
          setSyncError(
            isKnownError(error)
              ? error
              : new Error(`Couldn’t save to ${CLOUD_LABEL}.`),
          );
          const tries = failures + 1;
          setFailures(tries);
          const gaveUp = tries >= AUTO_RETRIES;
          if (gaveUp) showSnackbar(SAVE_FAILED);
          setSync(gaveUp ? "failed" : "retrying");
        }
      },
      sync === "retrying" ? RETRY_DELAY * failures : AUTOSAVE_DELAY,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, dirty, name, revision, sync, pause, failures]);

  const changed = () => {
    setDirty(true);
    setRevision((r) => r + 1);
  };

  const run = async (
    action: () => Promise<void>,
    failure = "Something went wrong. Please try again.",
  ) => {
    setBusy(true);
    setStatus(null);
    try {
      await action();
    } catch (error) {
      showSnackbar(failure);
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

  /** Opens `doc` as a new tile in Pigxel cloud, or unsaved when that fails. */
  const openNew = async (doc: PigxelDocument, tileName: string) => {
    let home: TileLocation | null = null;
    try {
      home = await saveTo(null, doc, tileName);
    } catch (error) {
      showSnackbar(
        `${isKnownError(error) ? error.message : `Couldn’t save to ${CLOUD_LABEL}.`} It opens unsaved.`,
        { tone: "warning" },
      );
    }
    onOpen(await draftFromDocument(userId, doc, tileName, home));
  };

  const onFileChosen = (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedFile(file))
      return showSnackbar(UNSUPPORTED_FILE, { tone: "warning" });
    void run(async () => {
      if (!isImageFile(file))
        return onOpen(
          await draftFromFile(userId, await file.text(), file.name, null),
        );
      const picture = await pictureFromFile(file);
      const pictureName = imageBaseName(file.name);
      if (tooLarge(picture)) setLargePicture({ picture, name: pictureName });
      else await openNew(documentFromFrames(picture), pictureName);
    });
  };

  const openLargePicture = (
    area: { x: number; y: number; w: number; h: number } | null,
  ) => {
    const large = largePicture;
    setLargePicture(null);
    if (!large) return;
    void run(() =>
      openNew(
        documentFromFrames(
          area ? croppedAnimation(large.picture, area) : fitted(large.picture),
        ),
        large.name,
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

  const openCloudTile = (picked: CloudTile) =>
    void run(async () => onOpen(await draftForCloudTile(userId, picked)));

  const download = () =>
    void run(async () => {
      downloadPigxel(name, serializePigxel(currentImage()));
      if (!location) setDirty(false);
      setStatus({ tone: "info", text: `Downloaded ${pigxelFileName(name)}` });
    });

  const saveNow = () =>
    void run(async () => {
      const savedRevision = latestRevision.current;
      setSync("saving");
      try {
        saved(await withLoading(SAVING, () => saveTo(location)), savedRevision);
        showSuccess(PROJECT_SAVED);
      } catch (error) {
        setSync(
          error instanceof CloudConflictError
            ? "conflict"
            : location
              ? "failed"
              : "idle",
        );
        if (error instanceof CloudConflictError) return;
        throw error;
      }
    }, SAVE_FAILED);

  const saveToCloudFirst = async () => {
    let cloud = null as CloudTile | null;
    await run(async () => {
      const savedRevision = latestRevision.current;
      setSync("saving");
      try {
        const next = await withLoading(SAVING, () => saveTo(location));
        saved(next, savedRevision);
        showSuccess(PROJECT_SAVED);
        cloud = next.tile;
      } catch (error) {
        setSync(
          error instanceof CloudConflictError
            ? "conflict"
            : location
              ? "failed"
              : "idle",
        );
        if (error instanceof CloudConflictError) return;
        throw error;
      }
    }, SAVE_FAILED);
    return cloud;
  };

  const leaving = useRef(false);
  const unsaved = !!location && (dirty || sync === "saving");
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!leaving.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  const place = CLOUD_LABEL;
  const locationStatus: FileStatus | null = !location
    ? null
    : pause
      ? { tone: "error", text: pause }
      : sync === "conflict"
        ? {
            tone: "error",
            text: "This tile was changed somewhere else. Choose which version to keep.",
          }
        : sync === "failed"
          ? {
              tone: "error",
              text: syncError?.message ?? `Couldn’t save to ${place}.`,
              retry: "Try again",
            }
          : sync === "retrying"
            ? {
                tone: "info",
                text: `Couldn’t save to ${place}. Trying again…`,
              }
            : sync === "saving" && failures > 0
              ? {
                  tone: "info",
                  text: `Couldn’t save to ${place}. Trying again…`,
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
    conflict: sync === "conflict",
    keepMine: () =>
      void run(async () => {
        if (!location) return;
        const savedRevision = latestRevision.current;
        setSync("saving");
        try {
          saved(
            await saveTo(location, currentImage(), name, true),
            savedRevision,
          );
        } catch (error) {
          setSync("failed");
          throw error;
        }
      }),
    reloadFromCloud: () =>
      void run(async () => {
        if (!location) return;
        const cloud = await readCloudTileVersion(location.tile.id);
        writeDraft(userId, {
          id: initial.id,
          name,
          file: cloud.file,
          location: {
            kind: "cloud",
            tile: { ...location.tile, version: cloud.version },
          },
          dirty: false,
        });
        leaving.current = true;
        window.location.reload();
      }),
    setPause,
    busy,
    status:
      sync === "failed" || status?.tone !== "error"
        ? (locationStatus ?? status)
        : status,
    onFileChosen,
    largePicture: largePicture?.picture ?? null,
    openLargePicture,
    cancelLargePicture: () => setLargePicture(null),
    openFromComputer,
    openDocument,
    openFrames,
    openCloudTile,
    download,
    saveToCloudFirst,
    save: saveNow,
    saveBeforeLeaving: async () => {
      if (!location) return true;
      const savedRevision = latestRevision.current;
      setSync("saving");
      try {
        saved(await withLoading(SAVING, () => saveTo(location)), savedRevision);
        showSuccess(PROJECT_SAVED);
        return true;
      } catch (error) {
        setSync(error instanceof CloudConflictError ? "conflict" : "failed");
        showSnackbar(SAVE_FAILED);
        return false;
      }
    },
  };
}
