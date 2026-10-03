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
      { label: "New group", onSelect: () => sprite.addLayer("group") },
      {
        label: "New reference layer…",
        onSelect: () => void addReference(sprite),
      },
    ],
    [
      { label: "Rename", onSelect: () => rename?.(), hidden: !rename },
      {
        label: layer?.visible ? "Hide" : "Show",
        onSelect: () =>
          layer && sprite.updateLayer(layerId, { visible: !layer.visible }),
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
        label: "Move out of group",
        onSelect: () => outside && sprite.moveLayer(layerId, outside),
        hidden: !outside,
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
