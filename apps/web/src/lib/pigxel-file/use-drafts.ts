import { useEffect, useSyncExternalStore } from "react";
import { draftsLoaded, loadDrafts, onDraftsLoaded } from "./draft";

export function useDraftsLoaded(userId: string) {
  const ready = useSyncExternalStore(
    onDraftsLoaded,
    () => draftsLoaded(userId),
    () => false,
  );
  useEffect(() => void loadDrafts(userId), [userId]);
  return ready;
}
