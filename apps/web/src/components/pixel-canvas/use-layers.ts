"use client";

import { useRef, useState } from "react";
import { flatten } from "@/lib/layers/composite";
import {
  allLayers,
  canPaint,
  createLayer,
  findLayer,
  insertLayer,
  moveLayer,
  nextName,
  pixelLayerIds,
  placeAbove,
  removeLayer,
  updateLayer,
} from "@/lib/layers/tree";
import type { Layer, LayerKind, Place } from "@/lib/layers/types";
import {
  backgroundColor,
  type Background,
  type PigxelDocument,
} from "@/lib/pigxel-file/format";
import { MAX_UNDO, type Size } from "./constants";
import { canvasOf } from "./helpers";

/** Layer settings the panel can change. */
export type LayerPatch = Partial<
  Pick<Layer, "name" | "visible" | "locked" | "opacity" | "blend">
> & { collapsed?: boolean };

export type LayersApi = ReturnType<typeof useLayers>;

/** A canvas holding one layer's pixels; empty when none are given. */
const layerCanvas = (size: Size, pixels?: Uint8ClampedArray) =>
  canvasOf(pixels ?? new Uint8ClampedArray(size.w * size.h * 4), size);

const contextOf = (canvas: HTMLCanvasElement | undefined) =>
  canvas?.getContext("2d", { willReadFrequently: true }) ?? null;

/** The tile at one point of its history. Unchanged layers share their pixels. */
type Snapshot = {
  tree: Layer[];
  size: Size;
  pixels: Map<string, Uint8ClampedArray>;
};

/**
 * The tile being edited, as layers: the tree (names, order, settings) is
 * React state, while each pixel layer's pixels live in a canvas of its own,
 * so tools draw on the active layer and the screen shows all of them
 * combined. `onChange` fires once per finished change, for saving.
 */
export function useLayers(initial: PigxelDocument, onChange: () => void) {
  const background: Background = initial.background;
  const [size, setSize] = useState<Size>({
    w: initial.width,
    h: initial.height,
  });
  const [tree, setTree] = useState<Layer[]>(initial.layers);
  const [activeId, setActiveId] = useState(
    () => pixelLayerIds(initial.layers).at(-1) ?? initial.layers[0]!.id,
  );
  // Bumped when what the screen shows changes, so the canvas repaints.
  const [version, setVersion] = useState(0);
  const [canvases] = useState(
    () =>
      new Map(
        pixelLayerIds(initial.layers).map((id) => [
          id,
          layerCanvas(
            { w: initial.width, h: initial.height },
            initial.pixels.get(id),
          ),
        ]),
      ),
  );
  // Pixels read back from the canvases, kept until the layer is drawn on.
  const cache = useRef(new Map<string, Uint8ClampedArray>());
  // Layers drawn on since the last finished change.
  const changed = useRef(new Set<string>());
  const history = useRef({
    past: [] as Snapshot[],
    present: {
      tree: initial.layers,
      size: { w: initial.width, h: initial.height },
      pixels: initial.pixels,
    } as Snapshot,
    future: [] as Snapshot[],
  });

  const readPixels = (id: string, { w, h }: Size = size) =>
    contextOf(canvases.get(id))?.getImageData(0, 0, w, h).data;

  const pixelsOf = (id: string) => {
    let pixels = cache.current.get(id);
    if (!pixels) {
      pixels = readPixels(id);
      if (pixels) cache.current.set(id, pixels);
    }
    return pixels;
  };

  /** The layers combined, without the kinds in `skip`. */
  const composite = (skip: LayerKind[] = []) =>
    flatten(tree, pixelsOf, size.w * size.h * 4, skip);

  /** Marks a layer's pixels as changed; the screen repaints. */
  const touched = (id = activeId) => {
    cache.current.delete(id);
    changed.current.add(id);
    setVersion((v) => v + 1);
  };

  /**
   * Ends a change: it becomes a step to undo, the screen repaints and the
   * tile is saved. Only the layers drawn on are read back from their canvases.
   */
  const finish = (next: { tree?: Layer[]; size?: Size } = {}) => {
    const { past, present } = history.current;
    const snapshot: Snapshot = {
      tree: next.tree ?? tree,
      size: next.size ?? size,
      pixels: new Map(),
    };
    for (const id of pixelLayerIds(snapshot.tree)) {
      const kept = present.pixels.get(id);
      const pixels =
        kept && !changed.current.has(id) ? kept : readPixels(id, snapshot.size);
      if (pixels) snapshot.pixels.set(id, pixels);
    }
    changed.current.clear();
    history.current = {
      past: [...past, present].slice(-MAX_UNDO),
      present: snapshot,
      future: [],
    };
    setVersion((v) => v + 1);
    onChange();
  };

  /** Records a finished drawing on a layer; the active one by default. */
  const commit = (id = activeId) => {
    touched(id);
    finish();
  };

  const changeTree = (next: Layer[]) => {
    setTree(next);
    finish({ tree: next });
  };

  /** Puts the tile back as it was at `snapshot`, redrawing only layers that differ. */
  const restore = (snapshot: Snapshot) => {
    const { present } = history.current;
    const sameSize =
      snapshot.size.w === present.size.w && snapshot.size.h === present.size.h;
    for (const [id, pixels] of snapshot.pixels) {
      if (sameSize && present.pixels.get(id) === pixels) continue;
      canvases.set(id, layerCanvas(snapshot.size, pixels));
      cache.current.delete(id);
    }
    changed.current.clear();
    setTree(snapshot.tree);
    setSize(snapshot.size);
    if (!findLayer(snapshot.tree, activeId))
      setActiveId(pixelLayerIds(snapshot.tree).at(-1)!);
    setVersion((v) => v + 1);
    onChange();
  };

  const undo = () => {
    const { past, present, future } = history.current;
    const previous = past.at(-1);
    if (!previous) return;
    restore(previous);
    history.current = {
      past: past.slice(0, -1),
      present: previous,
      future: [present, ...future],
    };
  };

  const redo = () => {
    const { past, present, future } = history.current;
    const [next, ...rest] = future;
    if (!next) return;
    restore(next);
    history.current = { past: [...past, present], present: next, future: rest };
  };

  const add = (
    kind: Exclude<LayerKind, "background">,
    pixels?: Uint8ClampedArray,
  ) => {
    const layer = createLayer(kind, nextName(tree, kind));
    if (layer.kind !== "group")
      canvases.set(layer.id, layerCanvas(size, pixels));
    setActiveId(layer.id);
    changeTree(insertLayer(tree, layer, placeAbove(tree, activeId)));
  };

  /** A tile keeps at least one layer to draw on, so that one can't be removed. */
  const canRemove = (id: string) =>
    allLayers(removeLayer(tree, id)).some(
      (layer) => layer.kind === "normal" || layer.kind === "background",
    );

  const remove = (id: string) => {
    if (!canRemove(id)) return;
    const next = removeLayer(tree, id);
    const found = findLayer(tree, id);
    const siblings = found?.parent?.children ?? tree;
    const neighbour =
      siblings[(found?.index ?? 0) - 1] ?? siblings[(found?.index ?? 0) + 1];
    for (const gone of pixelLayerIds(tree).filter(
      (layerId) => !pixelLayerIds(next).includes(layerId),
    )) {
      canvases.delete(gone);
      cache.current.delete(gone);
    }
    if (findLayer(tree, activeId) && !findLayer(next, activeId))
      setActiveId(
        neighbour?.id ?? found?.parent?.id ?? pixelLayerIds(next)[0]!,
      );
    changeTree(next);
  };

  /** Grows or shrinks every layer, keeping the top-left; a Background fills new space. */
  const resize = (next: Size) => {
    const fill = backgroundColor(background);
    for (const layer of allLayers(tree)) {
      changed.current.add(layer.id);
      const canvas = canvases.get(layer.id);
      const ctx = contextOf(canvas);
      if (!canvas || !ctx) continue;
      const old = ctx.getImageData(0, 0, size.w, size.h);
      canvas.width = next.w;
      canvas.height = next.h;
      if (layer.kind === "background" && fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(0, 0, next.w, next.h);
      }
      ctx.putImageData(old, 0, 0);
    }
    cache.current.clear();
    setSize(next);
    finish({ size: next });
  };

  const active = findLayer(tree, activeId)?.layer ?? null;

  return {
    size,
    tree,
    background,
    activeId,
    active,
    /** Whether the tools may draw on the active layer. */
    canPaint: canPaint(tree, activeId),
    version,
    /** The drawing context of a pixel layer; the active one by default. */
    context: (id = activeId) => contextOf(canvases.get(id)),
    composite,
    touched,
    commit,
    resize,
    undo,
    redo,
    select: setActiveId,
    add,
    canRemove,
    remove,
    update: (id: string, patch: LayerPatch) =>
      changeTree(updateLayer(tree, id, patch)),
    move: (id: string, place: Place) => changeTree(moveLayer(tree, id, place)),
    /** The tile as a document, for saving. */
    document: (): PigxelDocument => ({
      width: size.w,
      height: size.h,
      background,
      layers: tree,
      pixels: new Map(
        pixelLayerIds(tree).map((id) => [
          id,
          pixelsOf(id)?.slice() ?? new Uint8ClampedArray(size.w * size.h * 4),
        ]),
      ),
    }),
  };
}
