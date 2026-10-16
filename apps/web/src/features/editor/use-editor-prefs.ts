"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_PREFS,
  openedFor,
  readPrefs,
  type EditorPrefs,
} from "./editor-prefs";

const prefsKey = (userId: string) => `pigxel:layout:v3:${userId}`;
const changedKey = (userId: string) => `pigxel:layout-at:v3:${userId}`;
/** The movable-panels layout before; read once for its tool choices. */
const oldKey = (userId: string) => `pigxel:layout:v2:${userId}`;

const SYNC_DELAY = 1500;

type Start = Parameters<typeof openedFor>[1];

function storage() {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function changedAt(userId: string) {
  try {
    return Number(storage()?.getItem(changedKey(userId))) || 0;
  } catch {
    return 0;
  }
}

/**
 * The editor's prefs, kept in this browser and synced to the account
 * (editor_layouts), newest wins.
 */
export function useEditorPrefs(userId: string, start?: Start) {
  const [prefs, setPrefs] = useState<EditorPrefs>(() =>
    openedFor(read(userId), start),
  );
  const initial = useRef(prefs);
  const fromServer = useRef<EditorPrefs | null>(null);

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
        const next = openedFor(readPrefs(data.layout), start);
        try {
          storage()?.setItem(
            changedKey(userId),
            String(Date.parse(data.updated_at)),
          );
        } catch {}
        fromServer.current = next;
        setPrefs(next);
      });
    return () => {
      live = false;
    };
  }, [userId, start]);

  useEffect(() => {
    try {
      storage()?.setItem(prefsKey(userId), JSON.stringify(prefs));
    } catch {}
    if (prefs === initial.current || prefs === fromServer.current) return;
    const at = Date.now();
    try {
      storage()?.setItem(changedKey(userId), String(at));
    } catch {}
    const timer = setTimeout(() => void push(userId, prefs, at), SYNC_DELAY);
    return () => clearTimeout(timer);
  }, [userId, prefs]);

  return [prefs, setPrefs] as const;
}

async function push(userId: string, prefs: EditorPrefs, at: number) {
  await createClient()
    .from("editor_layouts")
    .upsert({
      user_id: userId,
      layout: prefs,
      updated_at: new Date(at).toISOString(),
    });
}

function read(userId: string): EditorPrefs {
  try {
    const raw =
      storage()?.getItem(prefsKey(userId)) ??
      storage()?.getItem(oldKey(userId));
    return raw ? readPrefs(JSON.parse(raw)) : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}
