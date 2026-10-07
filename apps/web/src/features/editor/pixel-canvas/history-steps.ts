import { allLayers } from "@/lib/layers/tree";
import type { Layer } from "@/lib/layers/types";
import type { Cels, Frame } from "@/lib/sprite/types";

type Step = {
  tree: Layer[];
  frames: Frame[];
  cels: Cels;
  size: { w: number; h: number };
  tags: unknown[];
  links: unknown[];
  celSettings: unknown[];
  palette: string[];
  slices: unknown[];
  colorMode: string;
  pixelRatio: { w: number; h: number };
  background: string;
};

const same = (a: unknown, b: unknown) =>
  a === b || JSON.stringify(a) === JSON.stringify(b);

const ids = (list: { id: string }[]) => list.map((item) => item.id);

function changedCels(before: Cels, after: Cels) {
  const out: { frame: string; layer: string }[] = [];
  const frames = new Set([...before.keys(), ...after.keys()]);
  for (const frame of frames) {
    const a = before.get(frame);
    const b = after.get(frame);
    const layers = new Set([...(a?.keys() ?? []), ...(b?.keys() ?? [])]);
    for (const layer of layers)
      if (a?.get(layer) !== b?.get(layer)) out.push({ frame, layer });
  }
  return out;
}

export function describeStep(before: Step, after: Step): string {
  if (before.size.w !== after.size.w || before.size.h !== after.size.h)
    return "Resize the tile";
  const beforeFrames = ids(before.frames);
  const afterFrames = ids(after.frames);
  if (afterFrames.length > beforeFrames.length) return "Add a frame";
  if (afterFrames.length < beforeFrames.length) return "Delete a frame";
  const beforeLayers = allLayers(before.tree);
  const afterLayers = allLayers(after.tree);
  const added = afterLayers.find(
    (layer) => !beforeLayers.some((old) => old.id === layer.id),
  );
  if (added) return `Add “${added.name}”`;
  const removed = beforeLayers.find(
    (layer) => !afterLayers.some((now) => now.id === layer.id),
  );
  if (removed) return `Delete “${removed.name}”`;
  const cels = changedCels(before.cels, after.cels);
  if (cels.length) {
    const layers = [...new Set(cels.map((cel) => cel.layer))];
    if (layers.length > 1) return `Change ${layers.length} layers`;
    const name =
      afterLayers.find((layer) => layer.id === layers[0])?.name ?? "a layer";
    const frames = new Set(cels.map((cel) => cel.frame)).size;
    if (frames > 1) return `Change “${name}” in ${frames} frames`;
    const frame = afterFrames.indexOf(cels[0]!.frame) + 1;
    return afterFrames.length > 1
      ? `Draw on “${name}”, frame ${frame}`
      : `Draw on “${name}”`;
  }
  if (before.tree !== after.tree) {
    if (ids(beforeLayers).join() !== ids(afterLayers).join())
      return "Move a layer";
    const changed = afterLayers.find((layer, i) => layer !== beforeLayers[i]);
    return changed ? `Change “${changed.name}”` : "Change layers";
  }
  if (before.frames !== after.frames)
    return beforeFrames.join() !== afterFrames.join()
      ? "Move frames"
      : "Change frame timing";
  if (!same(before.tags, after.tags)) return "Change tags";
  if (!same(before.links, after.links)) return "Link cels";
  if (!same(before.celSettings, after.celSettings))
    return "Change cel properties";
  if (!same(before.palette, after.palette)) return "Change the palette";
  if (!same(before.slices, after.slices)) return "Change slices";
  if (!same(before.colorMode, after.colorMode)) return "Change colour mode";
  if (!same(before.pixelRatio, after.pixelRatio)) return "Change pixel ratio";
  if (!same(before.background, after.background))
    return "Change the background";
  return "Change";
}
