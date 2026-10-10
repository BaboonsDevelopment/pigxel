"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_LAYOUT,
  readLayout,
  setPanelCollapsed,
  setPanelShown,
  type Layout,
  type PanelId,
} from "./layout";

const layoutKey = (userId: string) => `pigxel:layout:v2:${userId}`;
const changedKey = (userId: string) => `pigxel:layout-at:v2:${userId}`;
const oldKey = (userId: string) => `pigxel:layout:v1:${userId}`;

const SYNC_DELAY = 1500;

function storage() {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

const opened = (layout: Layout, panel?: PanelId) =>
  panel
    ? setPanelCollapsed(setPanelShown(layout, panel, true), panel, false)
    : layout;

function changedAt(userId: string) {
  try {
    return Number(storage()?.getItem(changedKey(userId))) || 0;
  } catch {
    return 0;
  }
}

export function useEditorLayout(userId: string, open?: PanelId) {
  const [layout, setLayout] = useState<Layout>(() =>
    opened(read(userId), open),
  );
  const first = useRef(true);
  const fromServer = useRef<Layout | null>(null);

  useEffect(() => {
    let live = true;
    void createClient()
      .from("editor_layouts")
      .select("layout, updated_at")
      .eq("user_id", userId)
      .maybeSingle<{ layout: unknown; updated_at: string }>()
      .then(({ data, error }) => {
        if (!live || error) return;
        const local = changedAt(userId);
        if (!data || Date.parse(data.updated_at) < local) {
          if (local) void push(userId, read(userId), local);
          return;
        }
        if (Date.parse(data.updated_at) === local) return;
        const next = opened(readLayout(data.layout), open);
        try {
          storage()?.setItem(
            changedKey(userId),
            String(Date.parse(data.updated_at)),
          );
        } catch {}
        fromServer.current = next;
        setLayout(next);
      });
    return () => {
      live = false;
    };
  }, [userId, open]);

  useEffect(() => {
    try {
      storage()?.setItem(layoutKey(userId), JSON.stringify(layout));
    } catch {}
    if (first.current) {
      first.current = false;
      return;
    }
    if (fromServer.current === layout) return;
    const at = Date.now();
    try {
      storage()?.setItem(changedKey(userId), String(at));
    } catch {}
    const timer = setTimeout(() => void push(userId, layout, at), SYNC_DELAY);
    return () => clearTimeout(timer);
  }, [userId, layout]);

  return [layout, setLayout] as const;
}

async function push(userId: string, layout: Layout, at: number) {
  await createClient()
    .from("editor_layouts")
    .upsert({
      user_id: userId,
      layout,
      updated_at: new Date(at).toISOString(),
    });
}

function read(userId: string): Layout {
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
}
