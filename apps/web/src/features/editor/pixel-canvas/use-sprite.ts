"use client";

import { useRef, useState } from "react";
import { compositeOver, flatten, orderedLayers } from "@/lib/layers/composite";
import * as layerTree from "@/lib/layers/tree";
import { inColorMode, type ColorMode } from "@/lib/palette/color-mode";
import { SQUARE, type PixelRatio } from "@/lib/sprite/pixel-ratio";
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

export type LayerPatch = Partial<
  Pick<
    Layer,
    "name" | "visible" | "locked" | "opacity" | "blend" | "labelColor"
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
) {
  const [background, setBackground] = useState(initial.background);
  const [size, setSize] = useState<Size>({
    w: initial.width,
    h: initial.height,
  });
  const [tree, setTree] = useState(initial.layers);
  const [soloId, setSoloId] = useState<string | null>(null);
  const [pickedFrames, setPickedFrames] = useState<string[]>([]);
  const [frames, setFrames] = useState(initial.frames);
  const [tags, setTags] = useState(initial.tags ?? []);
  const [links, setLinks] = useState(initial.links ?? []);
  const [celSettings, setCelSettings] = useState(initial.celSettings ?? []);
  const [palette, setPaletteState] = useState(initial.palette);
  const [slices, setSlicesState] = useState(initial.slices);
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

  const touched = () => {
    const canvas = cels.get(frameId, layerId);
    if (canvas) {
      cels.invalidate(canvas);
      changed.current.add(canvas);
    }
    repaint();
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
      colorMode?: ColorMode;
      pixelRatio?: PixelRatio;
      recolor?: ReadonlyMap<string, string>;
    } = {},
  ) => {
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
    const validLinks = celLinks.pruneCelLinks(
      next.links ?? links,
      (next.frames ?? frames).map((frame) => frame.id),
      layerTree.pixelLayerIds(next.tree ?? tree),
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
      tree: next.tree ?? tree,
      background: next.background ?? background,
      frames: next.frames ?? frames,
      tags: next.tags ?? tags,
      links: keptLinks,
      celSettings: pruneCelSettings(
        next.celSettings ?? celSettings,
        (next.frames ?? frames).map((frame) => frame.id),
        layerTree.allLayers(next.tree ?? tree).map((layer) => layer.id),
      ),
      size: next.size ?? size,
      cels: new Map(),
      palette: next.palette ?? palette,
      slices: next.slices ?? slices,
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
    setBackground(snapshot.background);
    setFrames(snapshot.frames);
    setTags(snapshot.tags);
    setLinks(snapshot.links);
    setCelSettings(snapshot.celSettings);
    setSize(snapshot.size);
    setPaletteState(snapshot.palette);
    setSlicesState(snapshot.slices);
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
    onChange();
  };

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
    layerId,
    activeLayer,
    eraseFill: fillOf(layerId),
    frameId,
    canPaint: layerTree.canPaint(tree, layerId),
    version,
    context,
    composite,
    previewComposite,
    buildUp,
    touched,
    commit,
    revert,
    editCel,
    clearCel,
    resize,
    rescale,
    transformAll,
    mapAllCels,
    undo,
    redo,
    hasCel: (frame: string, layer: string) => !!cels.get(frame, layer),
    isCelLinked: (layer: string, frame: string) =>
      !!celLinks.linkOf(links, layer, frame),
    linkCelRange,
    unlinkCel,
    readCel: (layer: string, frame: string) =>
      cels.pixels(frame, layer) ?? new Uint8ClampedArray(size.w * size.h * 4),
    writeCels,
    cutToLayer,
    duplicateLayer,
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
    document: (): PigxelDocument => ({
      id: initial.id,
      width: size.w,
      height: size.h,
      background,
      palette,
      slices,
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
