import { MAX_PALETTE, readPalette } from "./presets";

/**
 * Palette files other apps and Lospec use: GIMP's .gpl, plain .hex (one
 * `rrggbb` per line) and Paint.NET's .txt (`aarrggbb` per line, `;`
 * comments). Pictures (.png…) are read by their colours elsewhere.
 */

export const PALETTE_FILE_TYPES = ".gpl,.hex,.txt";

/** The colours of a palette file, or null when none can be read from it. */
export function parsePaletteFile(text: string): string[] | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const colors: string[] = [];
  if (lines[0]?.toUpperCase() === "GIMP PALETTE") {
    for (const line of lines.slice(1)) {
      // Header lines ("Name: …", "Columns: 8") and comments are skipped.
      const match = /^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})(\s|$)/.exec(line);
      if (!match) continue;
      const [r, g, b] = match.slice(1, 4).map(Number);
      colors.push(
        `#${[r, g, b].map((v) => Math.min(255, v!).toString(16).padStart(2, "0")).join("")}`,
      );
    }
  } else {
    for (const line of lines) {
      if (!line || line.startsWith(";") || line.startsWith("#!")) continue;
      const hex = line.replace(/^#/, "");
      // Paint.NET writes the alpha first: aarrggbb.
      if (/^[0-9a-f]{8}$/i.test(hex)) colors.push(`#${hex.slice(2)}`);
      else if (/^[0-9a-f]{6}$/i.test(hex)) colors.push(`#${hex}`);
    }
  }
  const palette = readPalette(colors.slice(0, MAX_PALETTE * 2));
  return palette?.length ? palette : null;
}

/** The palette as a GIMP .gpl file, which Aseprite, Lospec and most editors read. */
export function toGpl(palette: string[], name: string) {
  const rows = palette.map((color) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    return `${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${color.slice(1)}`;
  });
  return ["GIMP Palette", `Name: ${name}`, "Columns: 8", "#", ...rows, ""].join(
    "\n",
  );
}
