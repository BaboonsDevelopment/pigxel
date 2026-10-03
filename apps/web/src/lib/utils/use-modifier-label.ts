"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

export function useModifierLabel() {
  return useSyncExternalStore(
    noSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+"),
    () => "Ctrl+",
  );
}
