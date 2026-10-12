"use client";

import { useEffect, useRef, useState } from "react";
import {
  compositeOver,
  flatten,
  masked,
  orderedLayers,
} from "@/lib/layers/composite";
import * as layerTree from "@/lib/layers/tree";
import {
  replaceInlineText,
  type InlineText,
  type LayerText,
} from "@/lib/layers/text";
import {
  liftPixels,
  stampFloating,
  type Floating,
  type Mask,
} from "./selection";
import { rgbaOf } from "./paint";
import { inColorMode, type ColorMode } from "@/lib/palette/color-mode";
import { lockedAlpha } from "@/lib/layers/alpha-lock";
import { SQUARE, type PixelRatio } from "@/lib/sprite/pixel-ratio";
import type { Layer, LayerKind, Place } from "@/lib/layers/types";
import {
  NO_FLIP,
  flipTile,
  readCell,
  syncTilemap,
  tileCells,
  uniqueTiles,
  usedTiles,
  withNewTiles,
  writeCell,
  type TileFlip,
  type TileMode,
  type TileSize,
} from "@/lib/tilemap/tilemap";
import { backgroundColor, type PigxelDocument } from "@/lib/pigxel-file/format";
import type { Slice } from "@/lib/slices/slices";
import type { SavedSelection } from "@/lib/selections/saved";
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
import { insertAt, removeAt, type FrameTag } from "@/lib/sprite/tags";
import * as celLinks from "@/lib/sprite/cel-links";
import type { CelLink } from "@/lib/sprite/cel-links";
import {
  pruneCelSettings,
  settingsForFrame,
  type CelSetting,
} from "@/lib/sprite/cel-settings";
import { CelCanvases, contextOf, isTransparent } from "./cel-canvases";
import { MAX_UNDO, type Area, type Size } from "./constants";
import { describeStep } from "./history-steps";

export type LayerPatch = Partial<
  Pick<
    Layer,
    | "name"
    | "visible"
    | "locked"
    | "opacity"
    | "blend"
    | "labelColor"
    | "clip"
    | "alphaLock"
    | "above"
  >
> & { collapsed?: boolean };

export type SpriteApi = ReturnType<typeof useSprite>;

type NewLayer = {
  name?: string;
  cels?: Map<string, Uint8ClampedArray>;
  reuseEmpty?: boolean;
  hideOthers?: boolean;
};

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

type Snapshot = {
  tree: Layer[];
  background: PigxelDocument["background"];
  frames: Frame[];
  tags: FrameTag[];
  links: CelLink[];
  celSettings: CelSetting[];
  size: Size;
  cels: Cels;
  palette: string[];
  slices: Slice[];
  selections: SavedSelection[];
  colorMode: ColorMode;
  pixelRatio: PixelRatio;
};

export type KeptSprite = {
  history: History<Snapshot>;
  layerId: string;
  frameId: string;
};

export function useSprite(
  initial: PigxelDocument,
  onChange: () => void,
  kept?: KeptSprite,
  viewOnly = false,
  onViewOnly?: () => void,
) {
  const viewing = useRef(viewOnly);
  useEffect(() => {
    viewing.current = viewOnly;
  }, [viewOnly]);
  const blocked = useRef(onViewOnly);
  useEffect(() => {
    blocked.current = onViewOnly;
  });
  const [background, setBackground] = useState(initial.background);
  const [size, setSize] = useState<Size>({
    w: initial.width,
    h: initial.height,
  });
  const [tree, setTree] = useState(initial.layers);
  const [soloId, setSoloId] = useState<string | null>(null);
  const [pickedFrames, setPickedFrames] = useState<string[]>([]);
  const [pickedLayers, setPickedLayers] = useState<string[]>([]);
  const [tileMode, setTileMode] = useState<TileMode>("manual");
  const [activeTile, setActiveTile] = useState(0);
  const [tileFlip, setTileFlip] = useState<TileFlip>(NO_FLIP);
  const placing = useRef(false);
  const live = useRef<{ layerId: string; written: Set<string> } | null>(null);
  const [frames, setFrames] = useState(initial.frames);
  const [tags, setTags] = useState(initial.tags ?? []);
  const [links, setLinks] = useState(initial.links ?? []);
  const [celSettings, setCelSettings] = useState(initial.celSettings ?? []);
  const [palette, setPaletteState] = useState(initial.palette);
  const [slices, setSlicesState] = useState(initial.slices);
  const [selections, setSelectionsState] = useState(initial.selections ?? []);
  const [colorMode, setColorModeState] = useState<ColorMode>(
    initial.colorMode ?? "rgb",
  );
  const [pixelRatio, setPixelRatioState] = useState<PixelRatio>(
    initial.pixelRatio ?? SQUARE,
  );
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
  const beforeLeave = useRef<(() => void) | null>(null);
  const setLayerId = (id: string) => {
    if (id !== layerId) beforeLeave.current?.();
    setLayerIdState(id);
  };
  const setFrameId = (id: string) => {
    if (id !== frameId) beforeLeave.current?.();
    setFrameIdState(id);
  };
  const [version, setVersion] = useState(0);
  const [cels] = useState(() => new CelCanvases(initial.cels, size));
  const changed = useRef(new Set<HTMLCanvasElement>());
  const [stepLabels] = useState(() => new WeakMap<Snapshot, string>());
  const past = useRef<History<Snapshot>>(
    kept?.history ??
      history.startHistory({
        tree: initial.layers,
        background: initial.background,
        frames: initial.frames,
        tags: initial.tags ?? [],
        links: initial.links ?? [],
        celSettings: initial.celSettings ?? [],
        size,
        cels: initial.cels,
        palette: initial.palette,
        slices: initial.slices,
        selections: initial.selections ?? [],
        colorMode: initial.colorMode ?? "rgb",
        pixelRatio: initial.pixelRatio ?? SQUARE,
      }),
  );

  const repaint = () => setVersion((v) => v + 1);

  const isBackground = (id: string, inTree = tree) =>
    layerTree.findLayer(inTree, id)?.layer.kind === "background";

  const fillOf = (id: string) =>
    isBackground(id) ? backgroundColor(background) : null;

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

  const context = (create = false) => {
    let canvas = cels.get(frameId, layerId);
    const active = layerTree.findLayer(tree, layerId)?.layer;
    if (!canvas && create && active && active.kind !== "group")
      canvas = addCel(frameId, layerId);
    return contextOf(canvas);
  };

  const composite = (skip: LayerKind[] = [], frame = frameId) => {
    const appearance = settingsForFrame(celSettings, frame);
    return flatten(
      tree,
      (id) => cels.pixels(frame, id),
      size.w * size.h * 4,
      skip,
      (id) => appearance.get(id),
    );
  };

  const compositeOf = (ids: string[], frame = frameId) => {
    const appearance = settingsForFrame(celSettings, frame);
    return flatten(
      layerTree.onlyLayers(tree, new Set(ids)),
      (id) => cels.pixels(frame, id),
      size.w * size.h * 4,
      ["reference"],
      (id) => appearance.get(id),
    );
  };

  const previewComposite = (skip: LayerKind[] = [], frame = frameId) => {
    const solo = soloId ? layerTree.findLayer(tree, soloId) : null;
    const shown = solo ? layerTree.soloTree(tree, soloId!) : tree;
    const appearance = settingsForFrame(celSettings, frame);
    return flatten(
      shown,
      (id) => cels.pixels(frame, id),
      size.w * size.h * 4,
      skip,
      (id) => appearance.get(id),
    );
  };

  const buildUp = (skip: LayerKind[] = [], frame = frameId) => {
    const shown = new Set<string>();
    return layerTree.pixelLayerIds(tree).flatMap((layer) => {
      if (!cels.get(frame, layer)) return [];
      shown.add(layer);
      return [
        flatten(
          tree,
          (id) => (shown.has(id) ? cels.pixels(frame, id) : undefined),
          size.w * size.h * 4,
          skip,
        ),
      ];
    });
  };

  const alphaLocked = (id: string) =>
    !!layerTree.findLayer(tree, id)?.layer.alphaLock;

  const keepAlpha = (canvas: HTMLCanvasElement) => {
    if (!alphaLocked(layerId)) return;
    const ctx = contextOf(canvas);
    if (!ctx) return;
    const before = frameList.celOf(past.current.present.cels, frameId, layerId);
    const image = ctx.getImageData(0, 0, size.w, size.h);
    image.data.set(lockedAlpha(before, image.data));
    ctx.putImageData(image, 0, 0);
  };

  const touched = () => {
    const canvas = cels.get(frameId, layerId);
    if (canvas) {
      keepAlpha(canvas);
      cels.invalidate(canvas);
      changed.current.add(canvas);
    }
    liveTiles();
    repaint();
  };

  const liveTiles = () => {
    const layer = layerTree.findLayer(tree, layerId)?.layer;
    if (layer?.kind !== "tilemap" || tileMode !== "manual" || placing.current)
      return;
    const ids = frames.map((frame) => frame.id);
    const after = ids.map((frame) => cels.pixels(frame, layer.id));
    const synced = syncTilemap({
      size,
      tile: layer.tile,
      tiles: layer.tiles,
      before: ids.map((frame) =>
        frameList.celOf(past.current.present.cels, frame, layer.id),
      ),
      after,
      mode: "manual",
      flips: layer.flips,
      written:
        live.current?.layerId === layer.id ? live.current.written : undefined,
      collect: false,
    });
    live.current = { layerId: layer.id, written: synced.written };
    synced.cels.forEach((pixels, i) => {
      if (!pixels || pixels === after[i]) return;
      const target = cels.get(ids[i]!, layer.id);
      const ctx = contextOf(target);
      if (!target || !ctx) return;
      ctx.putImageData(
        new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, size.w, size.h),
        0,
        0,
      );
      cels.invalidate(target);
      changed.current.add(target);
    });
  };

  const syncTilemaps = (
    inTree: Layer[],
    inFrames: Frame[],
    inSize: Size,
    present: Snapshot,
  ) => {
    const resized = inSize.w !== present.size.w || inSize.h !== present.size.h;
    const ids = inFrames.map((frame) => frame.id);
    let out = inTree;
    for (const layer of layerTree.allLayers(inTree)) {
      if (layer.kind !== "tilemap") continue;
      const drawn = ids.some((frame) => {
        const canvas = cels.get(frame, layer.id);
        return !!canvas && changed.current.has(canvas);
      });
      if (!drawn && !resized) continue;
      const after = ids.map((frame) => cels.pixels(frame, layer.id));
      const synced = syncTilemap({
        size: inSize,
        tile: layer.tile,
        tiles: layer.tiles,
        before: ids.map((frame) =>
          resized ? undefined : frameList.celOf(present.cels, frame, layer.id),
        ),
        after,
        mode: resized ? "auto" : placing.current ? "place" : tileMode,
        flips: layer.flips,
        written:
          live.current?.layerId === layer.id ? live.current.written : undefined,
      });
      synced.cels.forEach((pixels, i) => {
        if (pixels && pixels !== after[i])
          changed.current.add(cels.set(ids[i]!, layer.id, inSize, pixels));
      });
      if (
        synced.tiles.length !== layer.tiles.length ||
        synced.tiles.some((tile, i) => tile !== layer.tiles[i])
      )
        out = layerTree.updateLayer(out, layer.id, { tiles: synced.tiles });
    }
    placing.current = false;
    live.current = null;
    return out;
  };

  const finish = (
    next: {
      tree?: Layer[];
      background?: PigxelDocument["background"];
      frames?: Frame[];
      tags?: FrameTag[];
      links?: CelLink[];
      celSettings?: CelSetting[];
      size?: Size;
      palette?: string[];
      slices?: Slice[];
      selections?: SavedSelection[];
      colorMode?: ColorMode;
      pixelRatio?: PixelRatio;
      recolor?: ReadonlyMap<string, string>;
    } = {},
  ) => {
    if (viewing.current) {
      restore(past.current.present, false);
      blocked.current?.();
      return;
    }
    const mode = next.colorMode ?? colorMode;
    if (mode !== "rgb")
      for (const canvas of changed.current) {
        const ctx = contextOf(canvas);
        if (!ctx) continue;
        const { width, height } = canvas;
        const out = inColorMode(
          ctx.getImageData(0, 0, width, height).data,
          mode,
          next.palette ?? palette,
          next.recolor,
        );
        if (!out) continue;
        ctx.putImageData(
          new ImageData(out as Uint8ClampedArray<ArrayBuffer>, width, height),
          0,
          0,
        );
        cels.invalidate(canvas);
      }
    const { present } = past.current;
    const nextTree = syncTilemaps(
      next.tree ?? tree,
      next.frames ?? frames,
      next.size ?? size,
      present,
    );
    if (nextTree !== (next.tree ?? tree)) setTree(nextTree);
    const validLinks = celLinks.pruneCelLinks(
      next.links ?? links,
      (next.frames ?? frames).map((frame) => frame.id),
      layerTree.pixelLayerIds(nextTree),
    );
    const samePixels = (
      a: Uint8ClampedArray | undefined,
      b: Uint8ClampedArray | undefined,
    ) =>
      a === b ||
      (!!a &&
        !!b &&
        a.length === b.length &&
        a.every((value, index) => value === b[index]));
    const keptLinks = validLinks.filter((link) => {
      const modified = link.frameIds.filter((frame) => {
        const canvas = cels.get(frame, link.layerId);
        const before = frameList.celOf(present.cels, frame, link.layerId);
        return (canvas && changed.current.has(canvas)) || !!canvas !== !!before;
      });
      if (modified.length === 1) {
        const source = cels.pixels(modified[0]!, link.layerId);
        for (const frame of link.frameIds) {
          if (frame === modified[0]) continue;
          if (source)
            changed.current.add(
              cels.set(
                frame,
                link.layerId,
                next.size ?? size,
                new Uint8ClampedArray(source),
              ),
            );
          else cels.delete(frame, link.layerId);
        }
      } else if (modified.length > 1) {
        const first = cels.pixels(link.frameIds[0]!, link.layerId);
        if (
          link.frameIds.some(
            (frame) => !samePixels(first, cels.pixels(frame, link.layerId)),
          )
        )
          return false;
      }
      return true;
    });
    const snapshot: Snapshot = {
      tree: nextTree,
      background: next.background ?? background,
      frames: next.frames ?? frames,
      tags: next.tags ?? tags,
      links: keptLinks,
      celSettings: pruneCelSettings(
        next.celSettings ?? celSettings,
        (next.frames ?? frames).map((frame) => frame.id),
        layerTree.allLayers(nextTree).map((layer) => layer.id),
      ),
      size: next.size ?? size,
      cels: new Map(),
      palette: next.palette ?? palette,
      slices: next.slices ?? slices,
      selections: next.selections ?? selections,
      colorMode: mode,
      pixelRatio: next.pixelRatio ?? pixelRatio,
    };
    const layerIds = new Set(layerTree.pixelLayerIds(snapshot.tree));
    for (const frame of snapshot.frames) snapshot.cels.set(frame.id, new Map());
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
    setLinks(keptLinks);
    setCelSettings(snapshot.celSettings);
    past.current = history.record(past.current, snapshot, MAX_UNDO);
    repaint();
    onChange();
  };

  const commit = () => {
    touched();
    finish();
  };

  const revert = () => {
    if (live.current?.layerId === layerId) {
      for (const frame of frames) {
        const copy = cels.get(frame.id, layerId);
        if (frame.id === frameId || !copy || !changed.current.has(copy))
          continue;
        const kept = frameList.celOf(
          past.current.present.cels,
          frame.id,
          layerId,
        );
        if (kept) cels.set(frame.id, layerId, size, kept);
        else cels.delete(frame.id, layerId);
        changed.current.delete(copy);
      }
      live.current = null;
    }
    const canvas = cels.get(frameId, layerId);
    if (!canvas || !changed.current.has(canvas)) return;
    const kept = frameList.celOf(past.current.present.cels, frameId, layerId);
    if (kept) cels.set(frameId, layerId, size, kept);
    else cels.delete(frameId, layerId);
    changed.current.delete(canvas);
    repaint();
  };

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

  const editLayerCels = (
    change: (pixels: Uint8ClampedArray) => Uint8ClampedArray | null,
  ) => {
    if (!layerTree.canPaint(tree, layerId)) return;
    const next = new Map<string, Uint8ClampedArray | null>();
    const locked = alphaLocked(layerId);
    for (const frame of frames) {
      const pixels = cels.pixels(frame.id, layerId);
      const out = pixels && change(pixels);
      if (out)
        next.set(
          frame.id,
          locked ? lockedAlpha(pixels, out) : new Uint8ClampedArray(out),
        );
    }
    if (next.size) writeCels(layerId, next);
  };

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

  const changeFrames = (
    next: Frame[],
    nextTags = tags,
    nextCelSettings = celSettings,
  ) => {
    setFrames(next);
    setTags(nextTags);
    finish({ frames: next, tags: nextTags, celSettings: nextCelSettings });
  };

  const saveTag = (tag: FrameTag) => {
    const next = tags.some((current) => current.id === tag.id)
      ? tags.map((current) => (current.id === tag.id ? tag : current))
      : [...tags, tag];
    setTags(next);
    finish({ tags: next });
  };

  const removeTag = (id: string) => {
    const next = tags.filter((tag) => tag.id !== id);
    setTags(next);
    finish({ tags: next });
  };

  const restore = (snapshot: Snapshot, notify = true) => {
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
    setBackground(snapshot.background);
    setFrames(snapshot.frames);
    setTags(snapshot.tags);
    setLinks(snapshot.links);
    setCelSettings(snapshot.celSettings);
    setSize(snapshot.size);
    setPaletteState(snapshot.palette);
    setSlicesState(snapshot.slices);
    setSelectionsState(snapshot.selections ?? []);
    setColorModeState(snapshot.colorMode);
    setPixelRatioState(snapshot.pixelRatio);
    if (!layerTree.findLayer(snapshot.tree, layerId))
      setLayerIdState(layerTree.pixelLayerIds(snapshot.tree).at(-1)!);
    if (frameList.frameIndex(snapshot.frames, frameId) < 0) {
      const at = frameList.frameIndex(frames, frameId);
      setFrameIdState(
        snapshot.frames[Math.min(at, snapshot.frames.length - 1)]!.id,
      );
    }
    repaint();
    if (notify) onChange();
  };

  const undo = () => {
    const back = history.undo(past.current);
    if (!back) return false;
    restore(back.present);
    past.current = back;
    return true;
  };

  const historySteps = () => {
    const { past: before, present, future } = past.current;
    const all = [...before, present, ...future];
    return {
      current: before.length,
      steps: all.map((step, i) => {
        if (!i) return "Start";
        let label = stepLabels.get(step);
        if (label === undefined) {
          label = describeStep(all[i - 1]!, step);
          stepLabels.set(step, label);
        }
        return label;
      }),
    };
  };

  const goToStep = (index: number) => {
    const { past: before, present, future } = past.current;
    const all = [...before, present, ...future];
    const target = all[index];
    if (!target || index === before.length) return;
    restore(target);
    past.current = {
      past: all.slice(0, index),
      present: target,
      future: all.slice(index + 1),
    };
  };

  const redo = () => {
    const forward = history.redo(past.current);
    if (!forward) return;
    restore(forward.present);
    past.current = forward;
  };

  const isEmptyLayer = (id: string) => frames.every((f) => !cels.get(f.id, id));

  const putCels = (
    id: string,
    next: Iterable<readonly [string, Uint8ClampedArray | null]>,
  ) => {
    for (const [frame, pixels] of next) {
      if (pixels) changed.current.add(addCel(frame, id, pixels));
      else cels.delete(frame, id);
    }
  };

  const canEditCels = (id: string) =>
    !viewing.current && layerTree.canPaint(tree, id);

  const pasteCel = (id: string, frame: string, pixels: Uint8ClampedArray) => {
    if (!canEditCels(id) || pixels.length !== size.w * size.h * 4) return;
    writeCels(id, new Map([[frame, new Uint8ClampedArray(pixels)]]));
  };

  const moveCel = (id: string, from: string, to: string) => {
    const pixels = cels.pixels(from, id);
    if (from === to || !pixels || !canEditCels(id) || isBackground(id)) return;
    writeCels(
      id,
      new Map([
        [to, new Uint8ClampedArray(pixels)],
        [from, null],
      ]),
    );
    setFrameId(to);
  };

  const linkCelRange = (
    layer: string,
    sourceFrame: string,
    frameIds: string[],
  ) => {
    const selected = new Set(frameIds);
    const members = frames
      .map((frame) => frame.id)
      .filter((id) => selected.has(id));
    const target = layerTree.findLayer(tree, layer)?.layer;
    if (
      !target ||
      target.kind === "group" ||
      members.length < 2 ||
      !members.includes(sourceFrame)
    )
      return;
    const source = cels.pixels(sourceFrame, layer);
    putCels(
      layer,
      members.map(
        (id) => [id, source ? new Uint8ClampedArray(source) : null] as const,
      ),
    );
    const next = celLinks.linkCels(links, layer, members);
    setLinks(next);
    finish({ links: next });
  };

  const unlinkCel = (layer: string, frame: string) => {
    const next = celLinks.unlinkCel(links, layer, frame);
    if (next === links) return;
    setLinks(next);
    finish({ links: next });
  };

  const celAppearance = (layer: string, frame: string) => {
    const found = layerTree.findLayer(tree, layer);
    if (!found || found.layer.kind === "group") return null;
    const appearance = settingsForFrame(celSettings, frame);
    const siblings = orderedLayers(found.parent?.children ?? tree, (id) =>
      appearance.get(id),
    ).filter((item) => item.kind !== "background");
    return {
      opacity: appearance.get(layer)?.opacity ?? 255,
      zIndex:
        found.layer.kind === "background"
          ? 0
          : siblings.findIndex((item) => item.id === layer),
      zCount: siblings.length,
    };
  };

  const setCelAppearance = (
    layer: string,
    frame: string,
    opacity: number,
    zIndex: number,
  ) => {
    const found = layerTree.findLayer(tree, layer);
    if (!found || found.layer.kind === "group") return;
    const current = celAppearance(layer, frame);
    if (!current) return;
    const appearance = settingsForFrame(celSettings, frame);
    const siblings = orderedLayers(found.parent?.children ?? tree, (id) =>
      appearance.get(id),
    ).filter((item) => item.kind !== "background");
    const without = siblings.filter((item) => item.id !== layer);
    if (found.layer.kind !== "background")
      without.splice(
        Math.max(0, Math.min(zIndex, without.length)),
        0,
        found.layer,
      );
    const changed = new Map<string, CelSetting>();
    for (const [index, item] of without.entries()) {
      const previous = appearance.get(item.id);
      changed.set(item.id, {
        frameId: frame,
        layerId: item.id,
        ...(previous?.opacity !== undefined && { opacity: previous.opacity }),
        zIndex:
          index +
          ((found.parent?.children ?? tree)[0]?.kind === "background" ? 1 : 0),
      });
    }
    if (found.layer.kind === "background")
      changed.set(layer, { frameId: frame, layerId: layer });
    const selected = changed.get(layer)!;
    if (opacity !== 255) selected.opacity = opacity;
    else delete selected.opacity;
    const next = [
      ...celSettings.filter(
        (setting) => setting.frameId !== frame || !changed.has(setting.layerId),
      ),
      ...[...changed.values()].filter(
        (setting) =>
          setting.opacity !== undefined || setting.zIndex !== undefined,
      ),
    ];
    if (current.opacity === opacity && current.zIndex === zIndex) return;
    finish({ celSettings: next });
  };

  const addLayer = (kind: Exclude<LayerKind, "background">, layer?: NewLayer) =>
    addLayers(kind, [layer ?? {}])[0]!;

  const addBackgroundLayer = () => {
    if (tree.some((layer) => layer.kind === "background")) return;
    const nextBackground = background === "transparent" ? "white" : background;
    const layer = layerTree.createLayer("background", "Background");
    const value = nextBackground === "black" ? 0 : 255;
    const pixels = new Uint8ClampedArray(size.w * size.h * 4);
    for (let i = 0; i < pixels.length; i += 4)
      pixels.set([value, value, value, 255], i);
    putCels(
      layer.id,
      frames.map((frame) => [frame.id, pixels] as const),
    );
    const next = [layer, ...tree];
    setBackground(nextBackground);
    setLayerId(layer.id);
    setTree(next);
    finish({ tree: next, background: nextBackground });
  };

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

  const duplicateLayer = (id: string) => {
    const source = layerTree.findLayer(tree, id)?.layer;
    if (!source) return;
    const copiedSettings: CelSetting[] = [];
    const copyOf = (layer: Layer): Layer => {
      const copy = { ...layer, id: crypto.randomUUID() };
      copiedSettings.push(
        ...celSettings
          .filter(
            (setting) =>
              setting.layerId === layer.id && setting.opacity !== undefined,
          )
          .map((setting) => ({
            frameId: setting.frameId,
            layerId: copy.id,
            opacity: setting.opacity,
          })),
      );
      for (const frame of frames) {
        const pixels = cels.pixels(frame.id, layer.id);
        if (pixels)
          putCels(copy.id, [[frame.id, new Uint8ClampedArray(pixels)]]);
      }
      return copy.kind === "group"
        ? { ...copy, children: copy.children.map(copyOf) }
        : copy.kind === "background"
          ? { ...copy, kind: "normal" }
          : copy;
    };
    const layer = { ...copyOf(source), name: `${source.name} copy` };
    setLayerId(layer.id);
    const next = layerTree.insertLayer(
      tree,
      layer,
      layerTree.placeAbove(tree, id),
    );
    setTree(next);
    finish({ tree: next, celSettings: [...celSettings, ...copiedSettings] });
  };

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

  const writeCels = (
    id: string,
    next: Map<string, Uint8ClampedArray | null>,
  ) => {
    putCels(id, next);
    placing.current = layerTree.findLayer(tree, id)?.layer.kind === "tilemap";
    finish();
  };

  const addAnimation = (spec: AnimationSpec) => {
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

  const canMergeDown = (id: string) => {
    const layer = layerTree.findLayer(tree, id)?.layer;
    const below = layerTree.layerBelow(tree, id);
    return (
      !!layer &&
      layer.kind !== "reference" &&
      (below?.kind === "normal" || below?.kind === "background")
    );
  };

  const mergeDown = (id: string) => {
    const layer = layerTree.findLayer(tree, id)?.layer;
    const below = layerTree.layerBelow(tree, id);
    if (!layer || !below || !canMergeDown(id)) return;
    const length = size.w * size.h * 4;
    if (layer.mask)
      for (const frame of frames) {
        const own = cels.pixels(frame.id, below.id);
        const mask = cels.pixels(frame.id, layer.id);
        if (own && mask) putCels(below.id, [[frame.id, masked(own, mask)]]);
      }
    else
      for (const frame of frames) {
        const top =
          layer.kind === "group"
            ? flatten(
                layer.children,
                (child) => cels.pixels(frame.id, child),
                length,
                ["reference"],
                (child) => settingsForFrame(celSettings, frame.id).get(child),
              )
            : cels.pixels(frame.id, layer.id);
        if (!top) continue;
        const own = cels.pixels(frame.id, below.id);
        const base = own
          ? new Uint8ClampedArray(own)
          : new Uint8ClampedArray(length);
        compositeOver(
          base,
          top,
          layer.opacity *
            ((settingsForFrame(celSettings, frame.id).get(layer.id)?.opacity ??
              255) /
              255),
          layer.blend,
        );
        putCels(below.id, [[frame.id, base]]);
      }
    for (const gone of layerTree.pixelLayerIds([layer])) cels.deleteLayer(gone);
    setLayerId(below.id);
    changeTree(layerTree.removeLayer(tree, id));
  };

  const canFlatten = (visibleOnly: boolean) =>
    layerTree.flattenTargets(tree, visibleOnly).length > 1;

  const flattenLayers = (visibleOnly: boolean) => {
    const ids = layerTree.flattenTargets(tree, visibleOnly);
    if (ids.length < 2) return;
    const merged = new Set(ids);
    const background = layerTree
      .allLayers(tree)
      .find(
        (layer) =>
          merged.has(layer.id) && layer.kind === "background" && layer.visible,
      );
    const layer = layerTree.createLayer(
      background ? "background" : "normal",
      background?.name ?? "Flattened",
    );
    for (const frame of frames)
      putCels(layer.id, [[frame.id, composite(["reference"], frame.id)]]);
    for (const id of ids) cels.deleteLayer(id);
    setLayerId(layer.id);
    changeTree(
      layerTree.insertLayer(layerTree.withoutLayers(tree, merged), layer, {
        parentId: null,
        index: 0,
      }),
    );
  };

  const canRemoveLayer = (id: string) =>
    layerTree
      .allLayers(layerTree.removeLayer(tree, id))
      .some(
        (layer) =>
          layer.kind === "normal" ||
          layer.kind === "background" ||
          layer.kind === "tilemap",
      );

  const addTilemapLayer = (tile: TileSize) => {
    const base = layerTree.createLayer(
      "tilemap",
      layerTree.nextName(tree, "tilemap"),
    );
    if (base.kind !== "tilemap") return;
    const layer = { ...base, tile };
    setLayerId(layer.id);
    changeTree(
      layerTree.insertLayer(tree, layer, layerTree.placeAbove(tree, layerId)),
    );
  };

  const convertToTilemap = (id: string, tile: TileSize) => {
    const layer = layerTree.findLayer(tree, id)?.layer;
    if (layer?.kind !== "normal") return;
    const tiles = withNewTiles(
      [],
      frames.map((frame) => cels.pixels(frame.id, id)),
      size,
      tile,
    );
    setActiveTile(0);
    changeTree(
      layerTree.replaceLayer(tree, id, {
        ...layer,
        kind: "tilemap",
        tile,
        tiles,
        flips: false,
      }),
    );
  };

  const convertToNormal = (id: string) => {
    const layer = layerTree.findLayer(tree, id)?.layer;
    if (layer?.kind !== "tilemap") return;
    const { name, visible, locked, opacity, blend, labelColor } = layer;
    changeTree(
      layerTree.replaceLayer(tree, id, {
        id,
        name,
        visible,
        locked,
        opacity,
        blend,
        labelColor,
        kind: "normal",
      }),
    );
  };

  const activeTilemap = () => {
    const layer = layerTree.findLayer(tree, layerId)?.layer;
    return layer?.kind === "tilemap" && layerTree.canPaint(tree, layerId)
      ? layer
      : null;
  };

  const placeTiles = (
    cells: { col: number; row: number }[],
    index: number | null,
  ) => {
    const layer = activeTilemap();
    const tile = index === null ? null : layer?.tiles[index];
    if (!layer || tile === undefined || !cells.length) return;
    const content =
      tile && flipTile(tile, layer.tile, layer.flips ? tileFlip : NO_FLIP);
    placing.current = true;
    const own = cels.pixels(frameId, layerId);
    const pixels = own
      ? new Uint8ClampedArray(own)
      : new Uint8ClampedArray(size.w * size.h * 4);
    for (const { col, row } of cells)
      writeCell(pixels, size, layer.tile, col, row, content);
    const ctx = context(true);
    if (!ctx) return;
    ctx.putImageData(
      new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, size.w, size.h),
      0,
      0,
    );
    touched();
  };

  const finishPlacing = () => {
    placing.current = true;
    finish();
  };

  const pickTile = (col: number, row: number) => {
    const layer = layerTree.findLayer(tree, layerId)?.layer;
    if (layer?.kind !== "tilemap") return;
    const content = readCell(
      cels.pixels(frameId, layerId),
      size,
      layer.tile,
      col,
      row,
    );
    const found = tileCells(
      content,
      layer.tile,
      layer.tile,
      layer.tiles,
      layer.flips,
    )[0];
    if (!found) return;
    setActiveTile(found.index);
    setTileFlip(found.flip);
  };

  const setTiles = (id: string, tiles: Uint8ClampedArray[]) => {
    const layer = layerTree.findLayer(tree, id)?.layer;
    if (layer?.kind !== "tilemap" || !layerTree.canPaint(tree, id)) return;
    changeTree(layerTree.updateLayer(tree, id, { tiles }));
  };

  const removeUnusedTiles = (id: string) => {
    const layer = layerTree.findLayer(tree, id)?.layer;
    if (layer?.kind !== "tilemap") return 0;
    const used = usedTiles(
      layer.tiles,
      frames.map((frame) => cels.pixels(frame.id, id)),
      size,
      layer.tile,
      layer.flips,
    );
    const removed = layer.tiles.length - used.length;
    if (!removed) return 0;
    const picked = layer.tiles[activeTile];
    setActiveTile(Math.max(0, picked ? used.indexOf(picked) : 0));
    setTiles(id, used);
    return removed;
  };

  const setTileFlips = (id: string, flips: boolean) => {
    const layer = layerTree.findLayer(tree, id)?.layer;
    if (layer?.kind !== "tilemap" || layer.flips === flips) return;
    if (!flips) setTileFlip(NO_FLIP);
    changeTree(
      layerTree.updateLayer(tree, id, {
        flips,
        ...(flips && { tiles: uniqueTiles(layer.tiles, layer.tile, true) }),
      }),
    );
  };

  const keepsPixelLayer = (next: Layer[]) =>
    layerTree
      .allLayers(next)
      .some(
        (layer) =>
          layer.kind === "normal" ||
          layer.kind === "background" ||
          layer.kind === "tilemap",
      );

  const replaceTree = (next: Layer[]) => {
    const kept = new Set(layerTree.pixelLayerIds(next));
    for (const gone of layerTree.pixelLayerIds(tree))
      if (!kept.has(gone)) cels.deleteLayer(gone);
    if (!layerTree.findLayer(next, layerId))
      setLayerId(layerTree.pixelLayerIds(next).at(-1)!);
    setPickedLayers([]);
    changeTree(next);
  };

  const canRemoveLayers = (ids: string[]) =>
    keepsPixelLayer(layerTree.withoutLayers(tree, new Set(ids)));

  const removeLayers = (ids: string[]) => {
    const next = layerTree.withoutLayers(tree, new Set(ids));
    if (keepsPixelLayer(next)) replaceTree(next);
  };

  const mergeLayers = (ids: string[]) => {
    const picked = layerTree.topLayers(tree, ids);
    if (picked.length < 2) return;
    const pixelIds = layerTree.pixelLayerIds(picked);
    const background = picked.find((layer) => layer.kind === "background");
    const top = picked.at(-1)!;
    const target = background ?? layerTree.createLayer("normal", top.name);
    for (const frame of frames)
      putCels(target.id, [[frame.id, compositeOf(pixelIds, frame.id)]]);
    const gone = new Set(
      picked.filter((layer) => layer !== background).map((layer) => layer.id),
    );
    const next = layerTree.withoutLayers(
      background
        ? tree
        : layerTree.insertLayer(
            tree,
            target,
            layerTree.placeAbove(tree, top.id),
          ),
      gone,
    );
    setLayerId(target.id);
    const kept = new Set(layerTree.pixelLayerIds(next));
    for (const gone of layerTree.pixelLayerIds(tree))
      if (!kept.has(gone)) cels.deleteLayer(gone);
    setPickedLayers([]);
    changeTree(next);
  };

  const addMask = (id: string) => {
    const target = layerTree.findLayer(tree, id)?.layer;
    if (!target || target.mask) return;
    const mask: Layer = {
      ...layerTree.createLayer("normal", `${target.name} mask`),
      mask: true,
    };
    setLayerId(mask.id);
    changeTree(
      layerTree.insertLayer(tree, mask, layerTree.placeAbove(tree, id)),
    );
  };

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
    changeFrames(
      frameList.insertFrame(frames, frame, at),
      insertAt(tags, at),
      copy
        ? [
            ...celSettings,
            ...celSettings
              .filter((setting) => setting.frameId === frameId)
              .map((setting) => ({ ...setting, frameId: frame.id })),
          ]
        : celSettings,
    );
  };

  const tweenFrames = (mask: Mask, offsets: { x: number; y: number }[]) => {
    if (!offsets.length || !layerTree.canPaint(tree, layerId)) return;
    const fill = fillOf(layerId);
    const lifted = liftPixels(
      cels.pixels(frameId, layerId) ??
        new Uint8ClampedArray(size.w * size.h * 4),
      size,
      mask,
      fill ? rgbaOf(fill) : null,
    );
    if (!lifted) return;
    const current = frames.find((f) => f.id === frameId)!;
    const at = frameList.frameIndex(frames, frameId) + 1;
    let nextFrames = frames;
    let nextTags = tags;
    const nextSettings = [...celSettings];
    offsets.forEach((offset, i) => {
      const frame = frameList.createFrame(current.duration);
      for (const layer of layerTree.allLayers(tree)) {
        if (layer.kind === "group") continue;
        const pixels =
          layer.id === layerId
            ? stampFloating(lifted.under, size, {
                ...lifted.floating,
                x: lifted.floating.x + offset.x,
                y: lifted.floating.y + offset.y,
              })
            : cels.pixels(frameId, layer.id);
        if (pixels) changed.current.add(addCel(frame.id, layer.id, pixels));
      }
      nextFrames = frameList.insertFrame(nextFrames, frame, at + i);
      nextTags = insertAt(nextTags, at + i);
      nextSettings.push(
        ...celSettings
          .filter((setting) => setting.frameId === frameId)
          .map((setting) => ({ ...setting, frameId: frame.id })),
      );
    });
    setFrameId(nextFrames[at]!.id);
    changeFrames(nextFrames, nextTags, nextSettings);
  };

  const removeFrame = (id: string) => {
    if (frames.length < 2) return;
    const next = frameList.removeFrame(frames, id);
    cels.deleteFrame(id);
    if (id === frameId) {
      const at = frameList.frameIndex(frames, id);
      setFrameId(next[Math.min(at, next.length - 1)]!.id);
    }
    changeFrames(next, removeAt(tags, frameList.frameIndex(frames, id)));
  };

  const resize = (next: Size, offset = { x: 0, y: 0 }) => {
    cels.resize(next, fillOf, offset);
    for (const cel of cels.list()) changed.current.add(cel.canvas);
    const nextSlices = movedSlices(slices, offset.x, offset.y, next.w, next.h);
    setSize(next);
    setSlicesState(nextSlices);
    finish({ size: next, slices: nextSlices });
  };

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

  const mapAllCels = (
    map: (rgba: Uint8ClampedArray) => Uint8ClampedArray,
    nextPalette?: string[],
  ) => {
    for (const { frameId: frame, layerId: layer } of cels.list())
      changed.current.add(
        cels.set(frame, layer, size, map(cels.pixels(frame, layer)!)),
      );
    if (nextPalette) setPaletteState(nextPalette);
    finish(nextPalette ? { palette: nextPalette } : {});
  };

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

  const setSlices = (next: Slice[]) => {
    setSlicesState(next);
    finish({ slices: next });
  };

  const setSelections = (next: SavedSelection[]) => {
    setSelectionsState(next);
    finish({ selections: next });
  };

  const touchAll = () => {
    for (const { canvas } of cels.list()) changed.current.add(canvas);
  };

  const setPalette = (
    next: string[],
    recolor?: ReadonlyMap<string, string>,
  ) => {
    if (colorMode === "indexed") touchAll();
    setPaletteState(next);
    finish({ palette: next, recolor });
  };

  const setPixelRatio = (next: PixelRatio) => {
    if (next.w === pixelRatio.w && next.h === pixelRatio.h) return;
    setPixelRatioState(next);
    finish({ pixelRatio: next });
  };

  const setColorMode = (mode: ColorMode) => {
    if (mode === colorMode) return;
    if (mode !== "rgb") touchAll();
    setColorModeState(mode);
    finish({ colorMode: mode });
  };

  return {
    id: initial.id,
    size,
    tree,
    soloId: soloId && layerTree.findLayer(tree, soloId) ? soloId : null,
    toggleSolo: (id: string) =>
      setSoloId((current) => (current === id ? null : id)),
    frames,
    tags,
    links,
    celSettings,
    celAppearance,
    setCelAppearance,
    saveTag,
    removeTag,
    background,
    palette,
    setPalette,
    colorMode,
    setColorMode,
    pixelRatio,
    setPixelRatio,
    slices,
    setSlices,
    selections,
    setSelections,
    layerId,
    activeLayer,
    eraseFill: fillOf(layerId),
    frameId,
    canPaint: !viewOnly && layerTree.canPaint(tree, layerId),
    viewOnly,
    version,
    context,
    composite,
    previewComposite,
    compositeOf,
    buildUp,
    touched,
    commit,
    revert,
    editCel,
    placeText: (
      piece: Floating,
      text: LayerText,
      existingId?: string,
      textId?: string,
      legacy?: InlineText,
    ) => {
      const targetId = existingId ?? layerId;
      if (viewOnly || !layerTree.canPaint(tree, targetId)) return false;
      beforeLeave.current?.();
      const layer = layerTree.findLayer(tree, targetId)?.layer;
      if (!layer || (layer.kind !== "normal" && layer.kind !== "background"))
        return false;
      const objects = layer.textObjects?.[frameId] ?? [];
      const previous = textId
        ? (objects.find((entry) => entry.id === textId) ??
          (legacy && legacy.id === textId && layer.texts?.[frameId]
            ? legacy
            : undefined))
        : undefined;
      if (textId && !previous) return false;
      const result = replaceInlineText(
        cels.pixels(frameId, targetId) ??
          new Uint8ClampedArray(size.w * size.h * 4),
        size,
        piece,
        text,
        previous,
      );
      if (!result) return false;
      const updated = {
        ...layer,
        ...(legacy && {
          texts: Object.fromEntries(
            Object.entries(layer.texts ?? {}).filter(
              ([frame]) => frame !== frameId,
            ),
          ),
        }),
        textObjects: {
          ...layer.textObjects,
          [frameId]: [
            ...objects.filter((entry) => entry.id !== result.record.id),
            result.record,
          ],
        },
      };
      const next = layerTree.replaceLayer(tree, layer.id, updated);
      putCels(layer.id, [[frameId, result.pixels]]);
      setTree(next);
      setLayerIdState(layer.id);
      finish({ tree: next });
      return true;
    },
    clearCel,
    resize,
    rescale,
    transformAll,
    mapAllCels,
    undo,
    redo,
    historySteps,
    goToStep,
    hasCel: (frame: string, layer: string) => !!cels.get(frame, layer),
    isCelLinked: (layer: string, frame: string) =>
      !!celLinks.linkOf(links, layer, frame),
    linkCelRange,
    canEditCels,
    pasteCel,
    moveCel,
    unlinkCel,
    editLayerCels,
    readCel: (layer: string, frame: string) =>
      cels.pixels(frame, layer) ?? new Uint8ClampedArray(size.w * size.h * 4),
    writeCels,
    cutToLayer,
    duplicateLayer,
    tileMode,
    setTileMode,
    activeTile,
    setActiveTile,
    addTilemapLayer,
    convertToTilemap,
    convertToNormal,
    placeTiles,
    finishPlacing,
    pickTile,
    tileFlip,
    setTileFlip,
    setTileFlips,
    setTiles,
    removeUnusedTiles,
    canMergeDown,
    mergeDown,
    canFlatten,
    flattenLayers,
    addAnimation,
    selectLayer: setLayerId,
    onLeaveCel: (callback: () => void) => {
      beforeLeave.current = callback;
    },
    addLayer,
    addBackgroundLayer,
    canAddBackgroundLayer: !tree.some((layer) => layer.kind === "background"),
    addLayers,
    canRemoveLayer,
    removeLayer,
    updateLayer: (id: string, patch: LayerPatch) =>
      changeTree(layerTree.updateLayer(tree, id, patch)),
    moveLayer: (id: string, place: Place) =>
      changeTree(layerTree.moveLayer(tree, id, place)),
    moveLayers: (ids: string[], place: Place) =>
      changeTree(layerTree.moveLayers(tree, ids, place)),
    removeLayers,
    canRemoveLayers,
    addMask,
    mergeLayers,
    selectedLayers: (() => {
      const picked = layerTree
        .allLayers(tree)
        .filter((layer) => pickedLayers.includes(layer.id))
        .map((layer) => layer.id);
      return picked.length > 1 ? picked : [layerId];
    })(),
    pickLayers: setPickedLayers,
    selectFrame: setFrameId,
    selectedFrames: (() => {
      const picked = frames
        .filter((frame) => pickedFrames.includes(frame.id))
        .map((frame) => frame.id);
      return picked.length > 1 ? picked : [frameId];
    })(),
    pickFrames: setPickedFrames,
    reverseFrames: (ids: string[]) =>
      changeFrames(frameList.reversedFrames(frames, ids)),
    setFramesDuration: (ids: string[], ms: number) =>
      changeFrames(frameList.withDuration(frames, ids, ms)),
    stepFrame: (step: number) =>
      setFrameId(frameList.stepFrame(frames, frameId, step).id),
    addFrame,
    tweenFrames,
    removeFrame,
    moveFrame: (id: string, index: number) =>
      changeFrames(frameList.moveFrame(frames, id, index)),
    setFrameDuration: (id: string, ms: number) =>
      changeFrames(
        frameList.updateFrame(frames, id, {
          duration: frameList.clampDuration(ms),
        }),
      ),
    keep: (): KeptSprite => ({ history: past.current, layerId, frameId }),
    adoptHistory: (kept: KeptSprite["history"]) => {
      const now = past.current;
      if (now.past.length || now.future.length || !kept.present) return;
      restore(kept.present, false);
      past.current = kept;
      repaint();
    },
    document: (): PigxelDocument => ({
      id: initial.id,
      width: size.w,
      height: size.h,
      background,
      palette,
      slices,
      selections,
      colorMode,
      pixelRatio,
      layers: tree,
      frames,
      tags,
      links,
      celSettings,
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
