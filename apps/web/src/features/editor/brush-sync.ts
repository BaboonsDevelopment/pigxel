import {
  decodeBrush,
  encodeBrush,
  MAX_BRUSHES,
  type SavedBrush,
} from "./brush-library";

export type BrushRecord = {
  id: string;
  brush: SavedBrush | null;
  updatedAt: number;
};
export function decodeBrushRecord(raw: unknown): BrushRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  if (
    typeof v.id !== "string" ||
    !v.id ||
    v.id.length > 100 ||
    typeof v.updatedAt !== "number" ||
    !Number.isFinite(v.updatedAt) ||
    v.updatedAt <= 0
  )
    return null;
  const brush = v.brush === null ? null : decodeBrush(v.brush);
  if (v.brush !== null && (!brush || brush.id !== v.id)) return null;
  return { id: v.id, brush, updatedAt: v.updatedAt };
}
export const encodeBrushRecord = (record: BrushRecord) => ({
  ...record,
  brush: record.brush ? encodeBrush(record.brush) : null,
});
export function mergeBrushRecords(
  local: BrushRecord[],
  remote: BrushRecord[],
): BrushRecord[] {
  const entries = new Map(local.map((record) => [record.id, record]));
  for (const record of remote) {
    if (record.updatedAt >= (entries.get(record.id)?.updatedAt ?? 0))
      entries.set(record.id, record);
  }
  return [...entries.values()];
}
export const visibleBrushes = (records: BrushRecord[]) =>
  [...records]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .flatMap((record) => (record.brush ? [record.brush] : []))
    .slice(0, MAX_BRUSHES);
