const tabsKey = (userId: string) => `pigxel:tabs:v1:${userId}`;

export function readTabs(
  userId: string,
  storage: Storage | undefined = browserStorage(),
): string[] {
  try {
    const raw = JSON.parse(storage?.getItem(tabsKey(userId)) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeTabs(
  userId: string,
  tabs: string[],
  storage: Storage | undefined = browserStorage(),
) {
  try {
    storage?.setItem(tabsKey(userId), JSON.stringify(tabs));
  } catch {}
}

export function withTab(tabs: string[], id: string, after?: string) {
  if (tabs.includes(id)) return tabs;
  const at = after ? tabs.indexOf(after) : -1;
  return at < 0
    ? [...tabs, id]
    : [...tabs.slice(0, at + 1), id, ...tabs.slice(at + 1)];
}

export function openTabAfter(userId: string, id: string, after: string) {
  writeTabs(userId, withTab(readTabs(userId), id, after));
}

export function withoutTab(tabs: string[], id: string) {
  return tabs.filter((tab) => tab !== id);
}

export function movedTab(tabs: string[], id: string, index: number) {
  const rest = withoutTab(tabs, id);
  const at = Math.max(0, Math.min(rest.length, index));
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}

export function tabAfterClosing(tabs: string[], id: string): string | null {
  const at = tabs.indexOf(id);
  if (at < 0) return null;
  return tabs[at + 1] ?? tabs[at - 1] ?? null;
}

function browserStorage() {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
