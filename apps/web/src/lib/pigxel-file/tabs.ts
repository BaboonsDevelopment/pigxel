/**
 * The tiles open as tabs in the editor, in their order, as draft ids. Kept
 * per signed-in user in localStorage (a short list of ids), so the tabs come
 * back after a reload. Closing a tab keeps the tile's draft: it's still in
 * My projects.
 */

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
  } catch {
    // The tabs start over next time.
  }
}

/** `tabs` with `id` open: where it was, else right after `after`, else at the end. */
export function withTab(tabs: string[], id: string, after?: string) {
  if (tabs.includes(id)) return tabs;
  const at = after ? tabs.indexOf(after) : -1;
  return at < 0
    ? [...tabs, id]
    : [...tabs.slice(0, at + 1), id, ...tabs.slice(at + 1)];
}

/** Opens `id` as a tab next to `after`, e.g. a tile opened from another's editor. */
export function openTabAfter(userId: string, id: string, after: string) {
  writeTabs(userId, withTab(readTabs(userId), id, after));
}

export function withoutTab(tabs: string[], id: string) {
  return tabs.filter((tab) => tab !== id);
}

/** `tabs` with `id` moved to `index`. */
export function movedTab(tabs: string[], id: string, index: number) {
  const rest = withoutTab(tabs, id);
  const at = Math.max(0, Math.min(rest.length, index));
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}

/** The tab to show when `id` closes: the one after it, else the one before. */
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
