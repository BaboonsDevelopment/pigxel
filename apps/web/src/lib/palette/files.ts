import { MAX_PALETTE, readPalette } from "./presets";

export const PALETTE_FILE_TYPES = ".gpl,.hex,.txt";

export function parsePaletteFile(text: string): string[] | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const colors: string[] = [];
  if (lines[0]?.toUpperCase() === "GIMP PALETTE") {
    for (const line of lines.slice(1)) {
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
      if (/^[0-9a-f]{8}$/i.test(hex)) colors.push(`#${hex.slice(2)}`);
      else if (/^[0-9a-f]{6}$/i.test(hex)) colors.push(`#${hex}`);
    }
  }
  const palette = readPalette(colors.slice(0, MAX_PALETTE * 2));
  return palette?.length ? palette : null;
}

export function toGpl(palette: string[], name: string) {
  const rows = palette.map((color) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    return `${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${color.slice(1)}`;
  });
  return ["GIMP Palette", `Name: ${name}`, "Columns: 8", "#", ...rows, ""].join(
    "\n",
  );
}
