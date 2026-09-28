import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/** True once running in the browser; false during server rendering and hydration. */
export function useIsClient() {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}
