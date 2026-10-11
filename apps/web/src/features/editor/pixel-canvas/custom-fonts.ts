import { createClient } from "@/lib/supabase/client";
import type { CustomFont } from "./text-fonts";

export type WebFont = { family: string; px: number };

export const TEXT_FONT_BUCKET = "text-fonts";

const faces = new Map<CustomFont, Promise<WebFont | null>>();

export async function addFontFace(
  font: CustomFont,
  data: ArrayBuffer,
): Promise<string> {
  const name = `pigxel-${font.slice("custom:".length)}`;
  const face = await new FontFace(name, data).load();
  document.fonts.add(face);
  return `"${name}"`;
}

export function rememberCustomFont(font: CustomFont, face: WebFont) {
  faces.set(font, Promise.resolve(face));
}

export function loadCustomFont(font: CustomFont): Promise<WebFont | null> {
  const known = faces.get(font);
  if (known) return known;
  const face = fetchFont(font).catch(() => null);
  faces.set(font, face);
  void face.then((loaded) => {
    if (!loaded && faces.get(font) === face) faces.delete(font);
  });
  return face;
}

async function fetchFont(font: CustomFont): Promise<WebFont | null> {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("text_fonts")
    .select("px, path")
    .eq("id", font.slice("custom:".length))
    .maybeSingle<{ px: number; path: string }>();
  if (!row) return null;
  const { data } = await supabase.storage
    .from(TEXT_FONT_BUCKET)
    .download(row.path);
  if (!data) return null;
  return {
    family: await addFontFace(font, await data.arrayBuffer()),
    px: row.px,
  };
}

const SAMPLE = "HAMWgy08";

export function detectPixelSize(family: string): number {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 112;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.textBaseline = "top";
  let best = { px: 8, blur: Infinity };
  for (let px = 4; px <= 64; px++) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${px}px ${family}`;
    ctx.fillText(SAMPLE, 2, 2);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let ink = 0;
    let soft = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (!data[i]) continue;
      ink++;
      if (data[i]! < 224) soft++;
    }
    if (!ink) continue;
    const blur = soft / ink;
    if (blur < 0.03) return px;
    if (blur < best.blur) best = { px, blur };
  }
  return best.px;
}
