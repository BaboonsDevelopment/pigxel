"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  encodeBrush,
  readBrushes,
  writeBrushes,
  type SavedBrush,
} from "./brush-library";
import {
  decodeBrushRecord,
  encodeBrushRecord,
  mergeBrushRecords,
  visibleBrushes,
  type BrushRecord,
} from "./brush-sync";

const key = (userId: string) => `pigxel:brushes:v2:${userId}`;
function read(userId: string): BrushRecord[] {
  try {
    const raw: unknown = JSON.parse(
      localStorage.getItem(key(userId)) ?? "null",
    );
    if (Array.isArray(raw))
      return raw.flatMap((item) => {
        const record = decodeBrushRecord(item);
        return record ? [record] : [];
      });
  } catch {
    /* Try the original local library. */
  }
  // Legacy entries are older than any cloud save or deletion.
  return readBrushes(userId).map((brush, index, all) => ({
    id: brush.id,
    brush,
    updatedAt: all.length - index,
  }));
}
function persist(userId: string, records: BrushRecord[]) {
  try {
    localStorage.setItem(
      key(userId),
      JSON.stringify(records.map(encodeBrushRecord)),
    );
  } catch {}
  writeBrushes(userId, visibleBrushes(records));
}

export function useBrushLibrary(userId: string) {
  const [records, setRecords] = useState(() => read(userId));
  const current = useRef(records);
  const [status, setStatus] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    const retry = () => setRevision((value) => value + 1);
    window.addEventListener("online", retry);
    void (async () => {
      try {
        const client = createClient();
        const { data, error } = await client
          .from("picture_brushes")
          .select("id, brush, updated_at")
          .eq("user_id", userId);
        if (!live) return;
        if (error) throw error;
        const remote = (data ?? []).flatMap((row) => {
          const record = decodeBrushRecord({
            id: row.id,
            brush: row.brush,
            updatedAt: Date.parse(row.updated_at),
          });
          return record ? [record] : [];
        });
        const merged = mergeBrushRecords(current.current, remote);
        current.current = merged;
        setRecords(merged);
        persist(userId, merged);
        const remoteDates = new Map(
          remote.map((record) => [record.id, record.updatedAt]),
        );
        const pending = merged.filter(
          (record) => record.updatedAt > (remoteDates.get(record.id) ?? 0),
        );
        if (pending.length) {
          const { error: saveError } = await client
            .from("picture_brushes")
            .upsert(
              pending.map((record) => ({
                user_id: userId,
                id: record.id,
                brush: record.brush ? encodeBrush(record.brush) : null,
                updated_at: new Date(record.updatedAt).toISOString(),
              })),
            );
          if (saveError) throw saveError;
        }
        if (live) setStatus("Brushes synced to your account");
      } catch {
        if (live)
          setStatus("Brushes available locally; cloud sync unavailable");
      }
    })();
    return () => {
      live = false;
      window.removeEventListener("online", retry);
    };
  }, [userId, revision]);

  const changeBrushes = (next: SavedBrush[]) => {
    const shown = visibleBrushes(current.current);
    const nextIds = new Set(next.map((brush) => brush.id));
    const at = Math.max(
      Date.now(),
      ...current.current.map((record) => record.updatedAt + 1),
    );
    const updates: BrushRecord[] = [
      ...next
        .filter((brush) => !shown.some((existing) => existing.id === brush.id))
        .map((brush) => ({ id: brush.id, brush, updatedAt: at })),
      ...shown
        .filter((brush) => !nextIds.has(brush.id))
        .map((brush) => ({ id: brush.id, brush: null, updatedAt: at })),
    ];
    if (!updates.length) return;
    const merged = mergeBrushRecords(current.current, updates);
    current.current = merged;
    setRecords(merged);
    persist(userId, merged);
    setStatus("Brushes saved locally; syncing…");
    setRevision((value) => value + 1);
  };
  return { brushes: visibleBrushes(records), changeBrushes, status };
}
