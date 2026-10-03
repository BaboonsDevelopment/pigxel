import { DEFAULT_NAMES, MAX_OPACITY } from "./constants";
import type { GroupLayer, Layer, LayerKind, Place } from "./types";

type Found = { layer: Layer; parent: GroupLayer | null; index: number };

export function findLayer(
  tree: Layer[],
  id: string,
  parent: GroupLayer | null = null,
): Found | null {
  for (const [index, layer] of tree.entries()) {
    if (layer.id === id) return { layer, parent, index };
    if (layer.kind === "group") {
      const found = findLayer(layer.children, id, layer);
      if (found) return found;
    }
  }
  return null;
}

export function allLayers(tree: Layer[]): Layer[] {
  return tree.flatMap((layer) =>
    layer.kind === "group" ? [layer, ...allLayers(layer.children)] : [layer],
  );
}

export function pixelLayerIds(tree: Layer[]): string[] {
  return allLayers(tree)
    .filter((layer) => layer.kind !== "group")
    .map((layer) => layer.id);
}

function mapTree(tree: Layer[], change: (layer: Layer) => Layer): Layer[] {
  return tree.map((layer) => {
    const next = change(layer);
    return next.kind === "group"
      ? { ...next, children: mapTree(next.children, change) }
      : next;
  });
}

export function updateLayer(
  tree: Layer[],
  id: string,
  patch: Partial<Omit<GroupLayer, "id" | "kind" | "children">>,
): Layer[] {
  return mapTree(tree, (layer) =>
    layer.id === id ? ({ ...layer, ...patch } as Layer) : layer,
  );
}

export function removeLayer(tree: Layer[], id: string): Layer[] {
  return tree
    .filter((layer) => layer.id !== id)
    .map((layer) =>
      layer.kind === "group"
        ? { ...layer, children: removeLayer(layer.children, id) }
        : layer,
    );
}

const lowestIndex = (list: Layer[]) => (list[0]?.kind === "background" ? 1 : 0);

export function insertLayer(
  tree: Layer[],
  layer: Layer,
  place: Place,
): Layer[] {
  const into = (list: Layer[]) => {
    const index = Math.min(
      list.length,
      Math.max(lowestIndex(list), place.index),
    );
    return [...list.slice(0, index), layer, ...list.slice(index)];
  };
  if (place.parentId === null) return into(tree);
  return mapTree(tree, (node) =>
    node.id === place.parentId && node.kind === "group"
      ? { ...node, children: into(node.children) }
      : node,
  );
}

function isInside(tree: Layer[], id: string, ancestorId: string) {
  const ancestor = findLayer(tree, ancestorId)?.layer;
  return (
    id === ancestorId ||
    (ancestor?.kind === "group" && !!findLayer(ancestor.children, id))
  );
}

export function moveLayer(tree: Layer[], id: string, place: Place): Layer[] {
  const found = findLayer(tree, id);
  if (!found || found.layer.kind === "background") return tree;
  if (place.parentId && isInside(tree, place.parentId, id)) return tree;
  const sameList = (found.parent?.id ?? null) === place.parentId;
  const index =
    sameList && found.index < place.index ? place.index - 1 : place.index;
  return insertLayer(removeLayer(tree, id), found.layer, { ...place, index });
}

export function placeAbove(tree: Layer[], id: string | null): Place {
  const found = id ? findLayer(tree, id) : null;
  if (!found) return { parentId: null, index: tree.length };
  return { parentId: found.parent?.id ?? null, index: found.index + 1 };
}

export function placeOutside(tree: Layer[], id: string): Place | null {
  const parent = findLayer(tree, id)?.parent;
  return parent ? placeAbove(tree, parent.id) : null;
}

export type PanelRow = { layer: Layer; depth: number } & Place;

export function panelRows(
  tree: Layer[],
  depth = 0,
  parentId: string | null = null,
): PanelRow[] {
  return tree
    .map((layer, index) => ({ layer, depth, parentId, index }))
    .reverse()
    .flatMap((row) => [
      row,
      ...(row.layer.kind === "group" && !row.layer.collapsed
        ? panelRows(row.layer.children, depth + 1, row.layer.id)
        : []),
    ]);
}

function withAncestors(tree: Layer[], id: string): Layer[] {
  const found = findLayer(tree, id);
  if (!found) return [];
  return [
    found.layer,
    ...(found.parent ? withAncestors(tree, found.parent.id) : []),
  ];
}

export const isShown = (tree: Layer[], id: string) =>
  withAncestors(tree, id).every((layer) => layer.visible);

const isLocked = (tree: Layer[], id: string) =>
  withAncestors(tree, id).some((layer) => layer.locked);

export function canPaint(tree: Layer[], id: string | null) {
  const layer = id ? findLayer(tree, id)?.layer : undefined;
  return (
    !!layer &&
    (layer.kind === "normal" || layer.kind === "background") &&
    isShown(tree, layer.id) &&
    !isLocked(tree, layer.id)
  );
}

export function nextName(tree: Layer[], kind: LayerKind): string {
  const base = DEFAULT_NAMES[kind];
  const used = allLayers(tree).map((layer) => {
    const match = new RegExp(`^${base} (\\d+)$`).exec(layer.name);
    return match ? Number(match[1]) : 0;
  });
  return `${base} ${Math.max(0, ...used) + 1}`;
}

export function createLayer(kind: LayerKind, name: string): Layer {
  const base = {
    id: crypto.randomUUID(),
    name,
    visible: true,
    locked: false,
    opacity: MAX_OPACITY,
    blend: "normal" as const,
  };
  return kind === "group"
    ? { ...base, kind, collapsed: false, children: [] }
    : { ...base, kind };
}
