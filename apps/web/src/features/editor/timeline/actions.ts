import type { MenuSections } from "../components/menu/constants";
import type { SpriteApi } from "../pixel-canvas/use-sprite";
import { fitImageToTile } from "@/lib/image/helpers";
import { placeOutside } from "@/lib/layers/tree";
import { frameIndex } from "@/lib/sprite/frames";
import { pickImageFile } from "./helpers";
import type { Playback } from "./use-playback";

async function addReference(sprite: SpriteApi) {
  const file = await pickImageFile();
  if (!file) return;
  const { w, h } = sprite.size;
  const pixels = await fitImageToTile(file, w, h);
  sprite.addLayer("reference", {
    cels: new Map(sprite.frames.map((frame) => [frame.id, pixels])),
  });
}

export function layerActions(
  sprite: SpriteApi,
  rename?: () => void,
  properties?: () => void,
  tilemap?: (convert: boolean) => void,
): MenuSections {
  const { activeLayer: layer, layerId } = sprite;
  const outside = placeOutside(sprite.tree, layerId);
  return [
    [
      {
        label: "New layer",
        shortcut: "Shift+N",
        onSelect: () => sprite.addLayer("normal"),
      },
      {
        label: "New background layer",
        onSelect: sprite.addBackgroundLayer,
        disabled: !sprite.canAddBackgroundLayer,
      },
      { label: "New group", onSelect: () => sprite.addLayer("group") },
      {
        label: "New reference layer…",
        onSelect: () => void addReference(sprite),
      },
      {
        label: "New tilemap layer…",
        onSelect: () => tilemap?.(false),
        hidden: !tilemap,
      },
    ],
    [
      { label: "Rename", onSelect: () => rename?.(), hidden: !rename },
      {
        label: "Properties…",
        onSelect: () => properties?.(),
        hidden: !properties,
      },
      {
        label: "Duplicate layer",
        onSelect: () => sprite.duplicateLayer(layerId),
        disabled: !layer,
      },
      {
        label: layer?.visible ? "Hide" : "Show",
        onSelect: () =>
          layer && sprite.updateLayer(layerId, { visible: !layer.visible }),
      },
      {
        label: sprite.soloId === layerId ? "Exit solo" : "Solo layer",
        onSelect: () => sprite.toggleSolo(layerId),
        disabled: !layer,
      },
      {
        label: layer?.locked ? "Unlock" : "Lock",
        onSelect: () =>
          layer && sprite.updateLayer(layerId, { locked: !layer.locked }),
      },
      {
        label: "Clear in this frame",
        shortcut: "Delete",
        onSelect: sprite.clearCel,
        disabled: !sprite.canPaint || !sprite.hasCel(sprite.frameId, layerId),
      },
    ],
    [
      {
        label: "Turn into tiles…",
        onSelect: () => tilemap?.(true),
        hidden: !tilemap || layer?.kind !== "normal",
      },
      {
        label: "Turn back into a normal layer",
        onSelect: () => sprite.convertToNormal(layerId),
        hidden: layer?.kind !== "tilemap",
      },
    ],
    [
      {
        label: "Move out of group",
        onSelect: () => outside && sprite.moveLayer(layerId, outside),
        hidden: !outside,
      },
    ],
    [
      {
        label: "Merge down",
        onSelect: () => sprite.mergeDown(layerId),
        disabled: !sprite.canMergeDown(layerId),
      },
      {
        label: "Flatten visible",
        onSelect: () => sprite.flattenLayers(true),
        disabled: !sprite.canFlatten(true),
      },
      {
        label: "Flatten",
        onSelect: () => sprite.flattenLayers(false),
        disabled: !sprite.canFlatten(false),
      },
    ],
    [
      {
        label: "Delete layer",
        onSelect: () => sprite.removeLayer(layerId),
        disabled: !sprite.canRemoveLayer(layerId),
      },
    ],
  ];
}

export function frameActions(
  sprite: SpriteApi,
  playback: Playback,
): MenuSections {
  const { frames, frameId } = sprite;
  const at = frameIndex(frames, frameId);
  const single = frames.length < 2;
  const several = sprite.selectedFrames.length > 1;
  return [
    [
      { label: "New empty frame", onSelect: () => sprite.addFrame(false) },
      {
        label: "Duplicate frame",
        shortcut: "Alt+N",
        onSelect: () => sprite.addFrame(true),
      },
    ],
    [
      {
        label: playback.playing ? "Pause" : "Play",
        onSelect: playback.toggle,
        disabled: !playback.canPlay,
      },
      {
        label: "Previous frame",
        shortcut: ",",
        onSelect: () => sprite.stepFrame(-1),
        disabled: single,
      },
      {
        label: "Next frame",
        shortcut: ".",
        onSelect: () => sprite.stepFrame(1),
        disabled: single,
      },
    ],
    [
      {
        label: "Select all frames",
        onSelect: () => sprite.pickFrames(frames.map((frame) => frame.id)),
        disabled: single,
      },
      {
        label: several ? "Reverse selected frames" : "Reverse all frames",
        onSelect: () => sprite.reverseFrames(sprite.selectedFrames),
        disabled: single,
      },
    ],
    [
      {
        label: "Move left",
        onSelect: () => sprite.moveFrame(frameId, at - 1),
        disabled: at === 0,
      },
      {
        label: "Move right",
        onSelect: () => sprite.moveFrame(frameId, at + 1),
        disabled: at === frames.length - 1,
      },
    ],
    [
      {
        label: "Delete frame",
        onSelect: () => sprite.removeFrame(frameId),
        disabled: single,
      },
    ],
  ];
}
