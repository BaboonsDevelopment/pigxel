"use client";

import { useRef, useState } from "react";
import { flatten } from "@/lib/layers/composite";
import * as layerTree from "@/lib/layers/tree";
import type { Layer, LayerKind, Place } from "@/lib/layers/types";
import { backgroundColor, type PigxelDocument } from "@/lib/pigxel-file/format";
import type { Slice } from "@/lib/slices/slices";
import { movedSlices } from "@/lib/sprite/canvas-size";
import {
  scalePicture,
  scaledSlices,
  type ScaleMethod,
} from "@/lib/sprite/sprite-size";
import * as frameList from "@/lib/sprite/frames";
import {
  transformPixels,
  transformSlices,
  turnsSideways,
  type TileTransform,
} from "@/lib/sprite/transform";
import * as history from "@/lib/sprite/history";
import type { Cels, Frame, History } from "@/lib/sprite/types";
import { CelCanvases, contextOf, isTransparent } from "./cel-canvases";
import { MAX_UNDO, type Area, type Size } from "./constants";

/** Layer settings the panel can change. */
export type LayerPatch = Partial<
  Pick<Layer, "name" | "visible" | "locked" | "opacity" | "blend">
> & { collapsed?: boolean };

export type SpriteApi = ReturnType<typeof useSprite>;

/** A layer to add, with its name and its pixels by frame id. */
export type NewLayer = {
  name?: string;
  cels?: Map<string, Uint8ClampedArray>;
  /**
   * Puts the pixels on the active layer instead when it is an untouched
   * drawing layer (a new tile's "Layer 1"), so empty layers don't pile up.
   */
  reuseEmpty?: boolean;
  /** Hides the other drawing layers, so the new one takes the tile's place. */
  hideOthers?: boolean;
};

/**
 * An animation to add: it runs from the first frame for `frameCount` frames,
 * with one layer per entry of `layers` (bottom to top), whose `cels` are its
 * full-tile pixels per frame (null where it is not seen). New layers go in a
 * group called `name`; an entry that `replaces` an existing layer gives that
 * layer these cels instead.
 */
export type AnimationSpec = {
  name: string;
  frameCount: number;
  duration: number;
  layers: {
    name: string;
    cels: (Uint8ClampedArray | null)[];
    replaces?: string;
  }[];
};

/** The tile at one point of its history. Unchanged cels share their pixels. */
type Snapshot = {
  tree: Layer[];
  frames: Frame[];
  size: Size;
  cels: Cels;
  palette: string[];
  slices: Slice[];
};

/**
 * What a tile's editor keeps when it closes, to pick up where it left off:
 * undo and redo, and the layer and frame being drawn on.
 */
export type KeptSprite = {
  history: History<Snapshot>;
  layerId: string;
  frameId: string;
};

/**
 * The tile being edited, as Aseprite calls it a sprite: a layer tree, a list
 * of frames, and a cel (one layer's pixels in one frame) wherever something
 * is drawn. The tree and the frames are React state; the cels live in
 * canvases (see CelCanvases), so the tools draw on the active cel (the
 * active layer in the active frame) and the screen shows the active frame
 * with every layer combined.
 *
 * Every finished change is a step Ctrl+Z can undo, and fires `onChange`, for
 * saving. With `kept` (whose present is `initial`) undo goes on from there.
 */
export function useSprite(
  initial: PigxelDocument,
  onChange: () => void,
  kept?: KeptSprite,
) {
  const { background } = initial;
  const [size, setSize] = useState<Size>({
    w: initial.width,
    h: initial.height,
  });
  const [tree, setTree] = useState(initial.layers);
  const [frames, setFrames] = useState(initial.frames);
  const [palette, setPaletteState] = useState(initial.palette);
  const [slices, setSlicesState] = useState(initial.slices);
  const [layerId, setLayerIdState] = useState(() =>
    kept && layerTree.findLayer(initial.layers, kept.layerId)
      ? kept.layerId
      : (layerTree.pixelLayerIds(initial.layers).at(-1) ??
        initial.layers[0]!.id),
  );
  const [frameId, setFrameIdState] = useState(() =>
    kept && frameList.frameIndex(initial.frames, kept.frameId) >= 0
      ? kept.frameId
      : initial.frames[0]!.id,
  );
  // Called before another cel becomes the active one, e.g. to put down a
  // floating selection on the cel it belongs to.
  const beforeLeave = useRef<(() => void) | null>(null);
  const setLayerId = (id: string) => {
    if (id !== layerId) beforeLeave.current?.();
    setLayerIdState(id);
  };
  const setFrameId = (id: string) => {
    if (id !== frameId) beforeLeave.current?.();
    setFrameIdState(id);
  };
  // Bumped when what the screen shows changes, so the canvas repaints.
  const [version, setVersion] = useState(0);
  const [cels] = useState(() => new CelCanvases(initial.cels, size));
  // Cels drawn on since the last finished change.
  const changed = useRef(new Set<HTMLCanvasElement>());
  const past = useRef<History<Snapshot>>(
    kept?.history ??
      history.startHistory({
        tree: initial.layers,
        frames: initial.frames,
        size,
        cels: initial.cels,
        palette: initial.palette,
        slices: initial.slices,
      }),
  );

  const repaint = () => setVersion((v) => v + 1);

  const isBackground = (id: string, inTree = tree) =>
    layerTree.findLayer(inTree, id)?.layer.kind === "background";

  /** What fills a cel of `id` where nothing is drawn: the Background's colour. */
  const fillOf = (id: string) =>
    isBackground(id) ? backgroundColor(background) : null;

  /** Adds a cel: a copy of `pixels`, or empty (the Background filled). */
  const addCel = (frame: string, layer: string, pixels?: Uint8ClampedArray) => {
    const canvas = cels.set(frame, layer, size, pixels);
    const fill = !pixels && fillOf(layer);
    const ctx = contextOf(canvas);
    if (fill && ctx) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, size.w, size.h);
    }
    return canvas;
  };

  /**
   * The drawing context of the active cel. With `create`, an empty cel is
   * made first where the active layer has none in this frame yet.
   */
  const context = (create = false) => {
    let canvas = cels.get(frameId, layerId);
    const active = layerTree.findLayer(tree, layerId)?.layer;
    if (!canvas && create && active && active.kind !== "group")
      canvas = addCel(frameId, layerId);
    return contextOf(canvas);
  };

  /** A frame's layers combined (the active frame by default), without the kinds in `skip`. */
  const composite = (skip: LayerKind[] = [], frame = frameId) =>
    flatten(tree, (id) => cels.pixels(frame, id), size.w * size.h * 4, skip);

  /** Marks the active cel as drawn on; the screen repaints. */
  const touched = () => {
    const canvas = cels.get(frameId, layerId);
    if (canvas) {
      cels.invalidate(canvas);
      changed.current.add(canvas);
    }
    repaint();
  };

  /**
   * Ends a change: it becomes a step to undo, the screen repaints and the
   * tile is saved. Only cels drawn on are read back from their canvases, and
   * those erased to nothing are removed.
   */
  const finish = (
    next: {
      tree?: Layer[];
      frames?: Frame[];
      size?: Size;
      palette?: string[];
      slices?: Slice[];
    } = {},
  ) => {
    const snapshot: Snapshot = {
      tree: next.tree ?? tree,
      frames: next.frames ?? frames,
      size: next.size ?? size,
      cels: new Map(),
      palette: next.palette ?? palette,
      slices: next.slices ?? slices,
    };
    const layerIds = new Set(layerTree.pixelLayerIds(snapshot.tree));
    for (const frame of snapshot.frames) snapshot.cels.set(frame.id, new Map());
    const { present } = past.current;
    for (const cel of cels.list()) {
      const frameCels = snapshot.cels.get(cel.frameId);
      const drawn = changed.current.has(cel.canvas);
      const kept =
        !drawn && frameList.celOf(present.cels, cel.frameId, cel.layerId);
      const pixels = kept || cels.pixels(cel.frameId, cel.layerId)!;
      const erased =
        drawn &&
        !isBackground(cel.layerId, snapshot.tree) &&
        isTransparent(pixels);
      if (!frameCels || !layerIds.has(cel.layerId) || erased)
        cels.delete(cel.frameId, cel.layerId);
      else frameCels.set(cel.layerId, pixels);
    }
    changed.current.clear();
    past.current = history.record(past.current, snapshot, MAX_UNDO);
    repaint();
    onChange();
  };

  /** Records a finished drawing on the active cel. */
  const commit = () => {
    touched();
    finish();
  };

  /**
   * Throws away what was drawn on the active cel since the last finished
   * change, e.g. a floating selection that is cancelled.
   */
  const revert = () => {
    const canvas = cels.get(frameId, layerId);
    if (!canvas || !changed.current.has(canvas)) return;
    const kept = frameList.celOf(past.current.present.cels, frameId, layerId);
    if (kept) cels.set(frameId, layerId, size, kept);
    else cels.delete(frameId, layerId);
    changed.current.delete(canvas);
    repaint();
  };

  /**
   * Changes the active cel's pixels with `change` (which gets them and
   * returns new ones, or null to leave them), as one undo step.
   */
  const editCel = (
    change: (pixels: Uint8ClampedArray) => Uint8ClampedArray | null,
  ) => {
    if (!layerTree.canPaint(tree, layerId)) return;
    const pixels =
      cels.pixels(frameId, layerId) ??
      new Uint8ClampedArray(size.w * size.h * 4);
    const next = change(pixels);
    const ctx = next && context(true);
    if (!next || !ctx) return;
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(next), size.w, size.h),
      0,
      0,
    );
    commit();
  };

  /** Empties the active cel; on the Background it goes back to the colour. */
  const clearCel = () => {
    const canvas = cels.get(frameId, layerId);
    if (!canvas || !layerTree.canPaint(tree, layerId)) return;
    const fill = fillOf(layerId);
    const ctx = contextOf(canvas);
    if (fill && ctx) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, size.w, size.h);
      commit();
    } else {
      cels.delete(frameId, layerId);
      finish();
    }
  };

  const changeTree = (next: Layer[]) => {
    setTree(next);
    finish({ tree: next });
  };

  const changeFrames = (next: Frame[]) => {
    setFrames(next);
    finish({ frames: next });
  };

  /** Puts the tile back as it was at `snapshot`, redrawing only cels that differ. */
  const restore = (snapshot: Snapshot) => {
    const { present } = past.current;
    const sameSize =
      snapshot.size.w === present.size.w && snapshot.size.h === present.size.h;
    for (const cel of cels.list())
      if (!frameList.celOf(snapshot.cels, cel.frameId, cel.layerId))
        cels.delete(cel.frameId, cel.layerId);
    for (const [frame, frameCels] of snapshot.cels)
      for (const [layer, pixels] of frameCels) {
        const same =
          sameSize &&
          cels.get(frame, layer) &&
          frameList.celOf(present.cels, frame, layer) === pixels;
        if (!same) cels.set(frame, layer, snapshot.size, pixels);
      }
    changed.current.clear();
    setTree(snapshot.tree);
    setFrames(snapshot.frames);
    setSize(snapshot.size);
    setPaletteState(snapshot.palette);
    setSlicesState(snapshot.slices);
    if (!layerTree.findLayer(snapshot.tree, layerId))
      setLayerIdState(layerTree.pixelLayerIds(snapshot.tree).at(-1)!);
    if (frameList.frameIndex(snapshot.frames, frameId) < 0) {
      const at = frameList.frameIndex(frames, frameId);
      setFrameIdState(
        snapshot.frames[Math.min(at, snapshot.frames.length - 1)]!.id,
      );
    }
    repaint();
    onChange();
  };

  /** Takes back the last change; false when there is none. */
  const undo = () => {
    const back = history.undo(past.current);
    if (!back) return false;
    restore(back.present);
    past.current = back;
    return true;
  };

  const redo = () => {
    const forward = history.redo(past.current);
    if (!forward) return;
    restore(forward.present);
    past.current = forward;
  };

  /** Whether a layer has nothing drawn in any frame. */
  const isEmptyLayer = (id: string) => frames.every((f) => !cels.get(f.id, id));

  /** Makes the cels of a layer these pixels (null empties the cel). */
  const putCels = (
    id: string,
    next: Iterable<[string, Uint8ClampedArray | null]>,
  ) => {
    for (const [frame, pixels] of next) {
      if (pixels) changed.current.add(addCel(frame, id, pixels));
      else cels.delete(frame, id);
    }
  };

  /** Adds a layer above the active one, in one undo step; returns its id. */
  const addLayer = (kind: Exclude<LayerKind, "background">, layer?: NewLayer) =>
    addLayers(kind, [layer ?? {}])[0]!;

  /**
   * Adds layers above the active one, each above the one before, in one undo
   * step; returns their ids. Calling addLayer once for each would not do:
   * every call starts from the same layer tree until the next render.
   */
  const addLayers = (
    kind: Exclude<LayerKind, "background">,
    layers: NewLayer[],
  ) => {
    let next = tree;
    let above = layerId;
    const ids = layers.map(
      ({
        name,
        cels: pixels = new Map(),
        reuseEmpty = false,
        hideOthers = false,
      }) => {
        const active = layerTree.findLayer(next, above)?.layer;
        const empty =
          reuseEmpty && active?.kind === "normal" && isEmptyLayer(active.id)
            ? active
            : null;
        const layer =
          empty ??
          layerTree.createLayer(kind, name ?? layerTree.nextName(next, kind));
        next = empty
          ? name
            ? layerTree.updateLayer(next, empty.id, { name })
            : next
          : layerTree.insertLayer(
              next,
              layer,
              layerTree.placeAbove(next, above),
            );
        if (hideOthers)
          for (const other of layerTree.allLayers(next))
            if (
              other.kind === "normal" &&
              other.id !== layer.id &&
              other.visible
            )
              next = layerTree.updateLayer(next, other.id, { visible: false });
        putCels(layer.id, pixels);
        above = layer.id;
        return layer.id;
      },
    );
    setLayerId(above);
    changeTree(next);
    return ids;
  };

  /**
   * Moves what `id` shows inside `area` (in every frame it has a cel) to a
   * new layer called `name` right above it, in one undo step; returns the
   * new layer's id.
   */
  const cutToLayer = (id: string, area: Area, name: string) => {
    const layer = layerTree.createLayer("normal", name);
    const inside = (i: number) => {
      const x = (i / 4) % size.w;
      const y = Math.floor(i / 4 / size.w);
      return (
        x >= area.x && y >= area.y && x < area.x + area.w && y < area.y + area.h
      );
    };
    for (const frame of frames) {
      const pixels = cels.pixels(frame.id, id);
      if (!pixels) continue;
      const cut = new Uint8ClampedArray(pixels.length);
      const kept = new Uint8ClampedArray(pixels);
      for (let i = 0; i < pixels.length; i += 4)
        if (inside(i)) {
          cut.set(pixels.subarray(i, i + 4), i);
          kept.fill(0, i, i + 4);
        }
      putCels(layer.id, [[frame.id, cut]]);
      putCels(id, [[frame.id, kept]]);
    }
    setLayerId(layer.id);
    changeTree(
      layerTree.insertLayer(tree, layer, layerTree.placeAbove(tree, id)),
    );
    return layer.id;
  };

  /** Replaces cels of a layer by frame id, in one undo step. */
  const writeCels = (
    id: string,
    next: Map<string, Uint8ClampedArray | null>,
  ) => {
    putCels(id, next);
    finish();
  };

  /** Adds an animation (see AnimationSpec) in one undo step. */
  const addAnimation = (spec: AnimationSpec) => {
    // The animation runs from the first frame. Missing frames are added,
    // showing what the last frame shows, so the still scene stays.
    const last = frames.at(-1)!;
    const nextFrames = frames.map((frame, i) =>
      i < spec.frameCount ? { ...frame, duration: spec.duration } : frame,
    );
    for (let i = frames.length; i < spec.frameCount; i++) {
      const frame = frameList.createFrame(spec.duration);
      for (const id of layerTree.pixelLayerIds(tree)) {
        const pixels = cels.pixels(last.id, id);
        if (pixels) addCel(frame.id, id, pixels);
      }
      nextFrames.push(frame);
    }
    const frameIds = nextFrames.slice(0, spec.frameCount).map((f) => f.id);
    const byFrame = (list: (Uint8ClampedArray | null)[]) =>
      frameIds.map(
        (id, i) => [id, list[i] ?? null] as [string, Uint8ClampedArray | null],
      );

    const added: Layer[] = [];
    let selected = layerId;
    for (const entry of spec.layers) {
      if (entry.replaces && layerTree.findLayer(tree, entry.replaces)) {
        putCels(entry.replaces, byFrame(entry.cels));
        selected = entry.replaces;
        continue;
      }
      const layer = layerTree.createLayer("normal", entry.name);
      putCels(layer.id, byFrame(entry.cels));
      added.push(layer);
      selected = layer.id;
    }
    const group = layerTree.createLayer("group", spec.name);
    const nextTree =
      added.length && group.kind === "group"
        ? layerTree.insertLayer(
            tree,
            { ...group, children: added },
            layerTree.placeAbove(tree, layerId),
          )
        : tree;
    setTree(nextTree);
    setFrames(nextFrames);
    setLayerId(selected);
    setFrameId(frameIds[0]!);
    finish({ tree: nextTree, frames: nextFrames });
  };

  /** A tile keeps at least one layer to draw on, so that one can't be removed. */
  const canRemoveLayer = (id: string) =>
    layerTree
      .allLayers(layerTree.removeLayer(tree, id))
      .some((layer) => layer.kind === "normal" || layer.kind === "background");

  const removeLayer = (id: string) => {
    if (!canRemoveLayer(id)) return;
    const next = layerTree.removeLayer(tree, id);
    const found = layerTree.findLayer(tree, id);
    const siblings = found?.parent?.children ?? tree;
    const neighbour =
      siblings[(found?.index ?? 0) - 1] ?? siblings[(found?.index ?? 0) + 1];
    const kept = new Set(layerTree.pixelLayerIds(next));
    for (const gone of layerTree.pixelLayerIds(tree))
      if (!kept.has(gone)) cels.deleteLayer(gone);
    if (!layerTree.findLayer(next, layerId))
      setLayerId(
        neighbour?.id ?? found?.parent?.id ?? layerTree.pixelLayerIds(next)[0]!,
      );
    changeTree(next);
  };

  /**
   * Adds a frame after the active one and moves to it. A copy repeats every
   * cel of the active frame; an empty one keeps only the Background and the
   * references, which belong to every frame.
   */
  const addFrame = (copy: boolean) => {
    const current = frames.find((f) => f.id === frameId)!;
    const frame = frameList.createFrame(current.duration);
    for (const layer of layerTree.allLayers(tree)) {
      if (layer.kind === "group") continue;
      const pixels = cels.pixels(frameId, layer.id);
      if (copy || layer.kind === "reference") {
        if (pixels) addCel(frame.id, layer.id, pixels);
      } else if (layer.kind === "background") addCel(frame.id, layer.id);
    }
    const at = frameList.frameIndex(frames, frameId) + 1;
    setFrameId(frame.id);
    changeFrames(frameList.insertFrame(frames, frame, at));
  };

  const removeFrame = (id: string) => {
    if (frames.length < 2) return;
    const next = frameList.removeFrame(frames, id);
    cels.deleteFrame(id);
    if (id === frameId) {
      const at = frameList.frameIndex(frames, id);
      setFrameId(next[Math.min(at, next.length - 1)]!.id);
    }
    changeFrames(next);
  };

  /**
   * Grows or shrinks every cel, the drawing moved by `offset` (kept at the
   * top-left by default); a Background fills new space. Slices move along,
   * cut to the new size. One undo step.
   */
  const resize = (next: Size, offset = { x: 0, y: 0 }) => {
    cels.resize(next, fillOf, offset);
    for (const cel of cels.list()) changed.current.add(cel.canvas);
    const nextSlices = movedSlices(slices, offset.x, offset.y, next.w, next.h);
    setSize(next);
    setSlicesState(nextSlices);
    finish({ size: next, slices: nextSlices });
  };

  /** Scales every cel to `next` by `method`, slices too, as one undo step. */
  const rescale = (next: Size, method: ScaleMethod) => {
    for (const { frameId: frame, layerId: layer } of cels.list()) {
      const rgba = cels.pixels(frame, layer)!;
      const scaled = scalePicture(
        { rgba, w: size.w, h: size.h },
        next.w,
        next.h,
        method,
      );
      changed.current.add(cels.set(frame, layer, next, scaled));
    }
    const nextSlices = scaledSlices(slices, size, next);
    setSize(next);
    setSlicesState(nextSlices);
    finish({ size: next, slices: nextSlices });
  };

  /** Turns or mirrors every cel, slices too, as one undo step. */
  const transformAll = (t: TileTransform) => {
    const next = turnsSideways(t) ? { w: size.h, h: size.w } : size;
    for (const { frameId: frame, layerId: layer } of cels.list()) {
      const out = transformPixels(
        cels.pixels(frame, layer)!,
        size.w,
        size.h,
        t,
      );
      changed.current.add(cels.set(frame, layer, next, out.rgba));
    }
    const nextSlices = transformSlices(slices, size.w, size.h, t);
    setSize(next);
    setSlicesState(nextSlices);
    finish({ size: next, slices: nextSlices });
  };

  const activeLayer = layerTree.findLayer(tree, layerId)?.layer ?? null;

  /** Changes the tile's slices, as one undo step. */
  const setSlices = (next: Slice[]) => {
    setSlicesState(next);
    finish({ slices: next });
  };

  /** Changes the tile's palette, as one undo step. */
  const setPalette = (next: string[]) => {
    setPaletteState(next);
    finish({ palette: next });
  };

  return {
    /** The tile's own id (see PigxelDocument). */
    id: initial.id,
    size,
    tree,
    frames,
    background,
    palette,
    setPalette,
    slices,
    setSlices,
    layerId,
    activeLayer,
    /** What erasing the active layer leaves: the Background's colour, or null for transparency. */
    eraseFill: fillOf(layerId),
    frameId,
    /** Whether the tools may draw on the active layer. */
    canPaint: layerTree.canPaint(tree, layerId),
    version,
    context,
    composite,
    touched,
    commit,
    revert,
    editCel,
    clearCel,
    resize,
    rescale,
    transformAll,
    undo,
    redo,
    /** Whether a layer has anything drawn in a frame. */
    hasCel: (frame: string, layer: string) => !!cels.get(frame, layer),
    /** A layer's full-tile pixels in a frame; transparent where it has no cel. */
    readCel: (layer: string, frame: string) =>
      cels.pixels(frame, layer) ?? new Uint8ClampedArray(size.w * size.h * 4),
    writeCels,
    cutToLayer,
    addAnimation,
    selectLayer: setLayerId,
    /** Registers what to do before another cel becomes the active one. */
    onLeaveCel: (callback: () => void) => {
      beforeLeave.current = callback;
    },
    addLayer,
    addLayers,
    canRemoveLayer,
    removeLayer,
    updateLayer: (id: string, patch: LayerPatch) =>
      changeTree(layerTree.updateLayer(tree, id, patch)),
    moveLayer: (id: string, place: Place) =>
      changeTree(layerTree.moveLayer(tree, id, place)),
    selectFrame: setFrameId,
    /** Moves to the frame `step` places away, wrapping around. */
    stepFrame: (step: number) =>
      setFrameId(frameList.stepFrame(frames, frameId, step).id),
    addFrame,
    removeFrame,
    moveFrame: (id: string, index: number) =>
      changeFrames(frameList.moveFrame(frames, id, index)),
    setFrameDuration: (id: string, ms: number) =>
      changeFrames(
        frameList.updateFrame(frames, id, {
          duration: frameList.clampDuration(ms),
        }),
      ),
    /** Undo history and the active cel, to keep when the editor closes. */
    keep: (): KeptSprite => ({ history: past.current, layerId, frameId }),
    /** The tile as a document, for saving. Its pixels are shared: never modify them. */
    document: (): PigxelDocument => ({
      id: initial.id,
      width: size.w,
      height: size.h,
      background,
      palette,
      slices,
      layers: tree,
      frames,
      cels: new Map(
        frames.map((frame) => [
          frame.id,
          new Map(
            layerTree.pixelLayerIds(tree).flatMap((id) => {
              const pixels = cels.pixels(frame.id, id);
              return pixels ? [[id, pixels] as const] : [];
            }),
          ),
        ]),
      ),
    }),
  };
}
