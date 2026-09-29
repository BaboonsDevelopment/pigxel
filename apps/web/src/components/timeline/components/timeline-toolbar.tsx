"use client";

import type { SpriteApi } from "@/components/pixel-canvas/use-sprite";
import { ACTION } from "../constants";
import { ICONS } from "../icons";
import type { Playback } from "../use-playback";
import { ControlGroup } from "./control-group";
import { FrameDuration } from "./frame-duration";
import { LayerOptions } from "./layer-options";

/**
 * The timeline's main controls, one group for the active layer and one for
 * the active frame. The rest is in the Layer and Frame menus at the top and
 * on right-click.
 */
export function TimelineToolbar({
  sprite,
  playback,
  onCollapse,
}: {
  sprite: SpriteApi;
  playback: Playback;
  onCollapse: () => void;
}) {
  const { activeLayer, layerId, frames, frameId } = sprite;
  const frame = frames.find((f) => f.id === frameId)!;
  const single = frames.length < 2;

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-1">
      <ControlGroup label="Layer">
        <button
          type="button"
          className={ACTION}
          title="New layer (Shift+N)"
          onClick={() => sprite.addLayer("normal")}
        >
          {ICONS.add}
        </button>
        <button
          type="button"
          className={ACTION}
          title="Delete layer"
          disabled={!sprite.canRemoveLayer(layerId)}
          onClick={() => sprite.removeLayer(layerId)}
        >
          {ICONS.remove}
        </button>
        {activeLayer && (
          <LayerOptions
            key={activeLayer.id}
            layer={activeLayer}
            onChange={(patch) => sprite.updateLayer(activeLayer.id, patch)}
          />
        )}
      </ControlGroup>

      <ControlGroup label="Frame">
        <button
          type="button"
          className={ACTION}
          title="Previous frame (,)"
          disabled={single}
          onClick={() => sprite.stepFrame(-1)}
        >
          {ICONS.previous}
        </button>
        <button
          type="button"
          className={ACTION}
          title={playback.playing ? "Pause" : "Play"}
          aria-pressed={playback.playing}
          disabled={!playback.canPlay}
          onClick={playback.toggle}
        >
          {playback.playing ? ICONS.pause : ICONS.play}
        </button>
        <button
          type="button"
          className={ACTION}
          title="Next frame (.)"
          disabled={single}
          onClick={() => sprite.stepFrame(1)}
        >
          {ICONS.next}
        </button>
        <button
          type="button"
          className={ACTION}
          title="New empty frame"
          onClick={() => sprite.addFrame(false)}
        >
          {ICONS.add}
        </button>
        <button
          type="button"
          className={ACTION}
          title="Duplicate frame (Alt+N)"
          onClick={() => sprite.addFrame(true)}
        >
          {ICONS.duplicate}
        </button>
        <button
          type="button"
          className={ACTION}
          title="Delete frame"
          disabled={single}
          onClick={() => sprite.removeFrame(frameId)}
        >
          {ICONS.remove}
        </button>
        <FrameDuration
          key={`${frame.id}:${frame.duration}`}
          duration={frame.duration}
          onChange={(ms) => sprite.setFrameDuration(frame.id, ms)}
        />
      </ControlGroup>

      <button
        type="button"
        className={`${ACTION} ml-auto text-muted-foreground`}
        title="Hide the timeline"
        onClick={onCollapse}
      >
        {ICONS.collapse}
      </button>
    </header>
  );
}
