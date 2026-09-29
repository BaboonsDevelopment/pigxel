import type { MenuSections } from "@/components/menu/constants";
import type { SpriteApi } from "@/components/pixel-canvas/use-sprite";
import { fitImageToTile } from "@/lib/image/helpers";
import { frameIndex } from "@/lib/sprite/frames";
import { pickImageFile } from "./helpers";
import type { Playback } from "./use-playback";

/** Asks for a picture and adds it as a reference layer, fitted to the tile. */
export async function addReference(sprite: SpriteApi) {
  const file = await pickImageFile();
  if (!file) return;
  const { w, h } = sprite.size;
  sprite.addLayer("reference", await fitImageToTile(file, w, h));
}

/**
 * Everything that can be done with the active layer: the Layer menu at the
 * top and a layer's right-click menu. `rename` is given where the name can
 * be edited in place.
 */
export function layerActions(
  sprite: SpriteApi,
  rename?: () => void,
): MenuSections {
  const { activeLayer: layer, layerId } = sprite;
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
        label: "Delete layer",
        onSelect: () => sprite.removeLayer(layerId),
        disabled: !sprite.canRemoveLayer(layerId),
      },
    ],
  ];
}

/** Everything that can be done with the active frame: the Frame menu and a frame's right-click menu. */
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
