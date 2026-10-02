import { useEffect, useSyncExternalStore } from "react";
import { draftsLoaded, loadDrafts, onDraftsLoaded } from "./draft";

/**
 * Loads this person's drafts from the browser; true once they can be read.
 * False during server rendering and hydration, like `useIsClient`.
 */
export function useDraftsLoaded(userId: string) {
  const ready = useSyncExternalStore(
    onDraftsLoaded,
    () => draftsLoaded(userId),
    () => false,
  );
  useEffect(() => void loadDrafts(userId), [userId]);
  return ready;
}
