"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  keymapChangedAt,
  parseKeymap,
  readKeymap,
  writeKeymap,
  type Keymap,
} from "./keymap";

const SYNC_DELAY = 1500;

async function push(userId: string, keymap: Keymap, at: number) {
  await createClient()
    .from("editor_keymaps")
    .upsert({
      user_id: userId,
      keys: keymap,
      updated_at: new Date(at).toISOString(),
    });
}

export function useKeymap(userId: string) {
  const [keymap, setKeymap] = useState(() => readKeymap(userId));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let live = true;
    void createClient()
      .from("editor_keymaps")
      .select("keys, updated_at")
      .eq("user_id", userId)
      .maybeSingle<{ keys: unknown; updated_at: string }>()
      .then(({ data, error }) => {
        if (!live || error) return;
        const local = keymapChangedAt(userId);
        const remote = data ? Date.parse(data.updated_at) : 0;
        if (remote > local && data) {
          const next = parseKeymap(data.keys);
          writeKeymap(userId, next, remote);
          setKeymap(next);
        } else if (local > remote) void push(userId, readKeymap(userId), local);
      });
    return () => {
      live = false;
    };
  }, [userId]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (next: Keymap) => {
    const at = Date.now();
    setKeymap(next);
    writeKeymap(userId, next, at);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void push(userId, next, at), SYNC_DELAY);
  };

  return [keymap, change] as const;
}
