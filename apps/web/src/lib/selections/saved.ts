export type SavedSelection = { id: string; name: string; mask: Uint8Array };

export const MAX_SAVED_SELECTIONS = 50;
export const MAX_SELECTION_NAME = 60;

export function encodeMask(mask: Uint8Array): string {
  const runs: number[] = [];
  let value = 0;
  let run = 0;
  for (const bit of mask) {
    const on = bit ? 1 : 0;
    if (on === value) {
      run++;
      continue;
    }
    runs.push(run);
    value = on;
    run = 1;
  }
  runs.push(run);
  return runs.join(",");
}

export function decodeMask(text: unknown, length: number): Uint8Array | null {
  if (typeof text !== "string" || !/^\d+(,\d+)*$/.test(text)) return null;
  const mask = new Uint8Array(length);
  let at = 0;
  let value = 0;
  for (const part of text.split(",")) {
    const run = Number(part);
    if (at + run > length) return null;
    if (value) mask.fill(1, at, at + run);
    at += run;
    value = 1 - value;
  }
  return at === length ? mask : null;
}

export function readSavedSelections(
  raw: unknown,
  width: number,
  height: number,
): SavedSelection[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  return raw.slice(0, MAX_SAVED_SELECTIONS).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const v = entry as Record<string, unknown>;
    const mask = decodeMask(v.mask, width * height);
    if (
      typeof v.id !== "string" ||
      !v.id ||
      v.id.length > 100 ||
      ids.has(v.id) ||
      typeof v.name !== "string" ||
      !v.name.trim() ||
      !mask
    )
      return [];
    ids.add(v.id);
    return [{ id: v.id, name: v.name.slice(0, MAX_SELECTION_NAME), mask }];
  });
}

export const writeSavedSelections = (list: SavedSelection[], length: number) =>
  list
    .filter((selection) => selection.mask.length === length)
    .map(({ id, name, mask }) => ({ id, name, mask: encodeMask(mask) }));

export function nextSelectionName(list: SavedSelection[]) {
  const names = new Set(list.map((selection) => selection.name));
  let n = list.length + 1;
  while (names.has(`Selection ${n}`)) n++;
  return `Selection ${n}`;
}
