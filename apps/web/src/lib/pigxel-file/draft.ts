import type { PenSettings } from "@/components/pixel-canvas/pen";
import type { DriveFile } from "./google-drive";

/**
 * The tile being edited, kept in the browser's localStorage so it survives
 * navigating around the site and reloading. One draft per signed-in user, so
 * people sharing a browser never see each other's work.
 */
export type Draft = {
  name: string;
  /** The tile as .pigxel file contents. */
  file: string;
  /** The Google Drive file the tile was opened from or saved to. */
  driveFile: DriveFile | null;
  /** Whether it has changes that weren't downloaded or saved to Drive yet. */
  dirty: boolean;
  pen: PenSettings;
  savedAt: number;
};

const DRAFT_VERSION = 1;

export function draftKey(userId: string) {
  return `pigxel:draft:v${DRAFT_VERSION}:${userId}`;
}

/** The saved draft, or null when there is none, it's unreadable, or storage is blocked. */
export function readDraft(
  userId: string,
  storage: Storage | undefined = browserStorage(),
): Draft | null {
  try {
    const raw = storage?.getItem(draftKey(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<Draft>;
    if (typeof draft.name !== "string" || typeof draft.file !== "string")
      return null;
    return draft as Draft;
  } catch {
    return null;
  }
}

/** Saves the draft; returns false when the browser refuses (full or blocked storage). */
export function writeDraft(
  userId: string,
  draft: Omit<Draft, "savedAt">,
  storage: Storage | undefined = browserStorage(),
): boolean {
  try {
    storage?.setItem(
      draftKey(userId),
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    );
    return Boolean(storage);
  } catch {
    return false;
  }
}

/** Whether this browser lets the site keep drafts (it may block site data). */
export function canStoreDrafts(
  storage: Storage | undefined = browserStorage(),
): boolean {
  try {
    if (!storage) return false;
    storage.setItem("pigxel:probe", "1");
    storage.removeItem("pigxel:probe");
    return true;
  } catch {
    return false;
  }
}

function browserStorage() {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    // Accessing localStorage throws when the browser blocks site data.
    return undefined;
  }
}
