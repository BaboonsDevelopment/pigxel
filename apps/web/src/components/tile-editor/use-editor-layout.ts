"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_LAYOUT,
  readLayout,
  type Layout,
} from "@/lib/editor-layout/layout";

const layoutKey = (userId: string) => `pigxel:layout:v2:${userId}`;
/** The layout before docks had stacks; only its tool choices carry over. */
const oldKey = (userId: string) => `pigxel:layout:v1:${userId}`;

function storage() {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * The editor's panel layout, kept in this browser per person; every change
 * is saved. The editor renders in the browser only, so it is read at once.
 */
export function useEditorLayout(userId: string) {
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      const raw = storage()?.getItem(layoutKey(userId));
      if (raw) return readLayout(JSON.parse(raw));
      const old = storage()?.getItem(oldKey(userId));
      const tools = old ? readLayout(JSON.parse(old)) : DEFAULT_LAYOUT;
      return {
        ...DEFAULT_LAYOUT,
        hiddenTools: tools.hiddenTools,
        groupTools: tools.groupTools,
      };
    } catch {
      return DEFAULT_LAYOUT;
    }
  });
  useEffect(() => {
    try {
      storage()?.setItem(layoutKey(userId), JSON.stringify(layout));
    } catch {
      // The layout starts over next time.
    }
  }, [userId, layout]);
  return [layout, setLayout] as const;
}
