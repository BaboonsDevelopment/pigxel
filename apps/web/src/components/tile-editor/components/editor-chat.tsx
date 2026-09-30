"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { ChatPanel } from "@/components/chat-panel/chat-panel";
import {
  MAX_OVERLAP,
  type CanvasBridge,
  type LayerInfo,
  type TileObject,
} from "@/components/chat-panel/constants";
import { drawnBox } from "@/components/chat-panel/helpers";
import type { Area } from "@/components/pixel-canvas/constants";
import { canvasOf, tileSnapshot } from "@/components/pixel-canvas/helpers";
import type { PixelCanvasHandle } from "@/components/pixel-canvas/pixel-canvas";
import type { SpriteApi } from "@/components/pixel-canvas/use-sprite";
import type { Playback } from "@/components/timeline/use-playback";
import { MAX_OBJECTS } from "@/lib/edit/constants";
import { findObjects } from "@/lib/edit/objects";
import { allLayers, canPaint, isShown } from "@/lib/layers/tree";

/**
 * The AI chat, wired to the tile. It pulls in the AI, editing and
 * picture-to-pixel-art code, so the editor loads it separately (see
 * editor.tsx) and drawing is ready before it arrives.
 */
export default function EditorChat({
  canvas,
  sprite,
  playback,
  onHighlight,
}: {
  canvas: RefObject<PixelCanvasHandle | null>;
  sprite: SpriteApi;
  playback: Playback;
  onHighlight: (area: Area | null) => void;
}) {
  // The chat's requests take a while; they must see the tile as it is by
  // then, not as it was when they started.
  const latest = useRef({ sprite, playback, onHighlight });
  useLayoutEffect(() => {
    latest.current = { sprite, playback, onHighlight };
  });
  // The bridge reads the refs only when the chat calls it, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [bridge] = useState(() =>
    createBridge(
      () => latest.current,
      () => canvas.current,
    ),
  );
  return <ChatPanel canvas={bridge} tileId={sprite.id} />;
}

/** What the bridge reads, always the latest. */
type Latest = {
  sprite: SpriteApi;
  playback: Playback;
  onHighlight: (area: Area | null) => void;
};

function createBridge(
  latest: () => Latest,
  canvas: () => PixelCanvasHandle | null,
): CanvasBridge {
  const sprite = () => latest().sprite;

  const layers = (): LayerInfo[] => {
    const { tree, frameId, size } = sprite();
    return allLayers(tree)
      .filter((layer) => layer.kind === "normal")
      .reverse()
      .map((layer) => ({
        id: layer.id,
        name: layer.name,
        editable: canPaint(tree, layer.id),
        box: drawnBox(sprite().readCel(layer.id, frameId), size),
      }));
  };

  return {
    size: () => sprite().size,
    isEmpty: () => canvas()?.isEmpty() ?? true,
    freeArea: () => canvas()?.freeArea() ?? null,
    snapshot: (area, background) => canvas()?.snapshot(area, background) ?? "",
    overlapsDrawing(area) {
      // Art on any layer counts, not only the one being drawn on.
      const pixels = canvas()?.readTile(area) ?? new Uint8ClampedArray();
      let drawn = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) drawn++;
      return drawn > area.w * area.h * MAX_OVERLAP;
    },
    layers,
    objects() {
      const { tree, frameId, size } = sprite();
      const found: TileObject[] = layers()
        .filter((layer) => isShown(tree, layer.id))
        .flatMap((layer) =>
          findObjects(sprite().readCel(layer.id, frameId), size.w, size.h).map(
            (area) => ({ area, layerId: layer.id }),
          ),
        );
      return found
        .sort((a, b) => b.area.w * b.area.h - a.area.w * a.area.h)
        .slice(0, MAX_OBJECTS);
    },
    activeLayer: () => sprite().layerId,
    frameId: () => sprite().frameId,
    framesOf: (layerId) =>
      sprite()
        .frames.filter((frame) => sprite().hasCel(frame.id, layerId))
        .map((frame) => frame.id),
    readCel: (layerId, frameId) => sprite().readCel(layerId, frameId),
    writeCels: (layerId, cels) => sprite().writeCels(layerId, cels),
    snapshotCel(layerId, frameId, area, background) {
      const { size } = sprite();
      const cel = canvasOf(sprite().readCel(layerId, frameId), size);
      return tileSnapshot(cel, area, background);
    },
    addLayer(name, pixels, replace) {
      // Something new that doesn't move is there in every frame.
      const cels = new Map(sprite().frames.map((f) => [f.id, pixels]));
      return sprite().addLayer("normal", {
        name,
        cels,
        reuseEmpty: true,
        hideOthers: replace,
      });
    },
    cutToLayer: (layerId, area, name) =>
      sprite().cutToLayer(layerId, area, name),
    addAnimation: (spec) => sprite().addAnimation(spec),
    play: () => latest().playback.play(),
    undo: () => sprite().undo(),
    selectArea: async () => (await canvas()?.selectArea()) ?? null,
    adjustArea: async (area) => (await canvas()?.adjustArea(area)) ?? null,
    highlight: (area) => latest().onHighlight(area),
  };
}
