import { TOOL_GROUPS } from "./tools";

export function ordered<T>(
  items: readonly T[],
  order: readonly string[],
  id: (item: T) => string,
): T[] {
  const ranks = new Map(order.map((key, index) => [key, index]));
  return [...items].sort(
    (a, b) => (ranks.get(id(a)) ?? Infinity) - (ranks.get(id(b)) ?? Infinity),
  );
}

export function orderedToolGroups(groupOrder: string[], toolOrder: string[]) {
  return ordered(TOOL_GROUPS, groupOrder, (group) => group.id).map((group) => ({
    ...group,
    tools: ordered(group.tools, toolOrder, (id) => id),
  }));
}

export function moveInOrder(ids: string[], id: string, direction: -1 | 1) {
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function dropInOrder(
  ids: string[],
  id: string,
  target: string,
  after: boolean,
) {
  if (id === target || !ids.includes(id) || !ids.includes(target)) return ids;
  const next = ids.filter((entry) => entry !== id);
  next.splice(next.indexOf(target) + (after ? 1 : 0), 0, id);
  return next;
}
