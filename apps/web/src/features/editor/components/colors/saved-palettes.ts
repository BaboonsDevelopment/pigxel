"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type SavedPalette = { id: string; name: string; colors: string[] };

const KEY = ["saved-palettes"];
const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/;

async function listPalettes(): Promise<SavedPalette[]> {
  const { data, error } = await createClient()
    .from("saved_palettes")
    .select("id, name, colors")
    .order("created_at");
  if (error) throw new Error("Couldn’t load your palettes.");
  return data as SavedPalette[];
}

export function useSavedPalettes() {
  const client = useQueryClient();
  const palettes = useQuery({
    queryKey: KEY,
    queryFn: listPalettes,
    staleTime: 5 * 60 * 1000,
  });
  const setPalettes = (update: (list: SavedPalette[]) => SavedPalette[]) =>
    client.setQueryData<SavedPalette[]>(KEY, (old) => update(old ?? []));

  const save = async (name: string, palette: string[]) => {
    const colors = palette
      .map((c) => c.toLowerCase())
      .filter((c) => HEX.test(c));
    if (!colors.length) return "This palette has no colours to save.";
    const saved = { id: crypto.randomUUID(), name, colors };
    setPalettes((list) => [...list, saved]);
    const { error } = await createClient().from("saved_palettes").insert(saved);
    if (!error) return null;
    setPalettes((list) => list.filter((p) => p.id !== saved.id));
    return error.message.includes("up to 100")
      ? error.message
      : "Couldn’t save the palette. Try again.";
  };

  const remove = async (id: string) => {
    setPalettes((list) => list.filter((p) => p.id !== id));
    const { error } = await createClient()
      .from("saved_palettes")
      .delete()
      .eq("id", id);
    if (!error) return null;
    void client.invalidateQueries({ queryKey: KEY });
    return "Couldn’t delete the palette. Try again.";
  };

  return { palettes, save, remove };
}
