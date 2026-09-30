"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/** Shortcut prefix for the person's platform; "Ctrl+" during server rendering. */
export function useModifierLabel() {
  return useSyncExternalStore(
    noSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+"),
    () => "Ctrl+",
  );
}
