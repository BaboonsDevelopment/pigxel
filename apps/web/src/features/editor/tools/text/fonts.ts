"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { TEXT_FONT_BUCKET } from "../../pixel-canvas/custom-fonts";
import { customFontId, type CustomFont } from "../../pixel-canvas/text-fonts";

export type SavedFont = { id: CustomFont; name: string; px: number };

export const FONTS_KEY = ["text-fonts"];

export const MAX_FONT_BYTES = 2 * 1024 * 1024;

export const FONT_TYPES: Record<string, string> = {
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
};

export const fontExtension = (name: string) =>
  name.split(".").pop()?.toLowerCase() ?? "";

const uuidOf = (font: CustomFont) => font.slice("custom:".length);

async function listFonts(): Promise<SavedFont[]> {
  const { data, error } = await createClient()
    .from("text_fonts")
    .select("id, name, px")
    .order("created_at");
  if (error) throw new Error("Couldn’t load your fonts. Try again.");
  return data.map((row) => ({
    id: customFontId(row.id as string),
    name: row.name as string,
    px: row.px as number,
  }));
}

export function useCustomFonts() {
  return useQuery({
    queryKey: FONTS_KEY,
    queryFn: listFonts,
    staleTime: 5 * 60 * 1000,
  });
}

export async function uploadFont(
  font: SavedFont,
  file: File,
): Promise<string | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return "Sign in again to upload fonts.";
  const extension = fontExtension(file.name);
  const path = `${auth.user.id}/${uuidOf(font.id)}.${extension}`;
  const upload = await supabase.storage
    .from(TEXT_FONT_BUCKET)
    .upload(path, file, { contentType: FONT_TYPES[extension] });
  if (upload.error) return "Couldn’t upload the font. Try again.";
  const { error } = await supabase.from("text_fonts").insert({
    id: uuidOf(font.id),
    name: font.name,
    px: font.px,
    path,
  });
  if (!error) return null;
  await supabase.storage.from(TEXT_FONT_BUCKET).remove([path]);
  return error.message.includes("up to 20")
    ? error.message
    : "Couldn’t save the font. Try again.";
}

export async function deleteFont(font: CustomFont): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("text_fonts")
    .delete()
    .eq("id", uuidOf(font))
    .select("path")
    .maybeSingle<{ path: string }>();
  if (error) return false;
  if (data) await supabase.storage.from(TEXT_FONT_BUCKET).remove([data.path]);
  return true;
}
