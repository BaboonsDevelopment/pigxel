"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readLayout, type Layout } from "./layout";
import {
  LAYOUT_PRESETS,
  mergePresets,
  readPresets,
  type LayoutPreset,
  type SavedPresets,
} from "./layout-presets";

const key = (userId: string) => `pigxel:layout-presets:v1:${userId}`;
function read(userId: string): SavedPresets {
  try {
    return readPresets(JSON.parse(localStorage.getItem(key(userId)) ?? "null"));
  } catch {
    return {};
  }
}
function store(userId: string, presets: SavedPresets) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(presets));
    return true;
  } catch {
    return false;
  }
}
async function push(
  userId: string,
  name: LayoutPreset,
  entry: NonNullable<SavedPresets[LayoutPreset]>,
) {
  return createClient()
    .from("editor_layout_presets")
    .upsert({
      user_id: userId,
      name,
      layout: entry.layout,
      updated_at: new Date(entry.updatedAt).toISOString(),
    });
}

export function useLayoutPresets(userId: string) {
  const [presets, setPresets] = useState(() => read(userId));
  const current = useRef(presets);
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const { data, error } = await createClient()
          .from("editor_layout_presets")
          .select("name, layout, updated_at")
          .eq("user_id", userId);
        if (!live || error) return;
        const remote = readPresets(
          Object.fromEntries(
            (data ?? []).map((row) => [
              row.name,
              {
                layout: row.layout,
                updatedAt: Date.parse(row.updated_at),
              },
            ]),
          ),
        );
        const merged = mergePresets(current.current, remote);
        current.current = merged;
        setPresets(merged);
        store(userId, merged);
        for (const name of LAYOUT_PRESETS) {
          const entry = merged[name];
          if (entry && entry.updatedAt > (remote[name]?.updatedAt ?? 0))
            await push(userId, name, entry);
        }
      } catch {
        /* Local presets remain available offline. */
      }
    })();
    return () => {
      live = false;
    };
  }, [userId]);

  const save = async (name: LayoutPreset, layout: Layout) => {
    const entry = {
      layout: readLayout(structuredClone(layout)),
      updatedAt: Date.now(),
    };
    const next = { ...current.current, [name]: entry };
    current.current = next;
    setPresets(next);
    const local = store(userId, next);
    setStatus(local ? `${name} saved locally; syncing…` : `Saving ${name}…`);
    try {
      const { error } = await push(userId, name, entry);
      if (current.current[name] !== entry) return;
      setStatus(
        error
          ? local
            ? `${name} saved locally; cloud sync unavailable`
            : `${name} could not be saved`
          : `${name} saved`,
      );
    } catch {
      if (current.current[name] === entry)
        setStatus(
          local
            ? `${name} saved locally; cloud sync unavailable`
            : `${name} could not be saved`,
        );
    }
  };
  return { presets, save, status };
}
