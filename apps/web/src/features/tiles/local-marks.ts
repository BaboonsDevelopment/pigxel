type MarkKind = "pinned" | "opened" | "archived";

const keyOf = (userId: string, kind: MarkKind) => `pigxel:${kind}:${userId}`;

export function readMarks(
  userId: string,
  kind: MarkKind,
): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(keyOf(userId, kind));
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

export function writeMark(
  userId: string,
  kind: MarkKind,
  id: string,
  on: boolean,
) {
  const marks = readMarks(userId, kind);
  if (on) marks[id] = Date.now();
  else delete marks[id];
  try {
    window.localStorage.setItem(keyOf(userId, kind), JSON.stringify(marks));
  } catch {}
}
