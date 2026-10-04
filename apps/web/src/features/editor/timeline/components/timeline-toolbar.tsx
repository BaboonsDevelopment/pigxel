"use client";

import type { SpriteApi } from "../../pixel-canvas/use-sprite";
import { EditorSelect } from "../../components/editor-select";
import { PLAY_MODES, PLAY_SPEEDS, type PlayMode } from "@/lib/sprite/tags";
import { ACTION } from "../constants";
import { ICONS } from "../icons";
import type { Playback } from "../use-playback";
import { ControlGroup } from "./control-group";
import { FrameDuration } from "./frame-duration";
import { LayerOptions } from "./layer-options";

export function TimelineToolbar({
  sprite,
  playback,
}: {
  sprite: SpriteApi;
  playback: Playback;
}) {
  const { activeLayer, layerId, frames, frameId } = sprite;
  const frame = frames.find((f) => f.id === frameId)!;
  const single = frames.length < 2;

  return (
    <header className="flex items-center gap-x-4 overflow-x-auto border-b px-3 py-1 whitespace-nowrap">
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
          title="New background layer"
          disabled={!sprite.canAddBackgroundLayer}
          onClick={sprite.addBackgroundLayer}
        >
          Background
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
        <EditorSelect
          ariaLabel="Playback speed"
          title="Playback speed"
          value={String(playback.speed)}
          onChange={(value) => playback.setSpeed(Number(value))}
          options={PLAY_SPEEDS.map((speed) => ({
            value: String(speed),
            label: String(speed) + "×",
          }))}
          className="h-7 w-14 shrink-0 px-2 text-xs"
        />
        <EditorSelect
          ariaLabel="Playback mode"
          title={
            playback.tagId
              ? "The selected tag sets how it plays"
              : "How all frames play"
          }
          disabled={!!playback.tagId}
          value={playback.mode}
          onChange={(value) => playback.setMode(value as PlayMode)}
          options={PLAY_MODES}
          className="h-7 w-24 shrink-0 px-2 text-xs"
        />
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
          key={`${frame.id}:${frame.duration}:${sprite.selectedFrames.length}`}
          duration={frame.duration}
          count={sprite.selectedFrames.length}
          onChange={(ms) => sprite.setFramesDuration(sprite.selectedFrames, ms)}
        />
      </ControlGroup>
    </header>
  );
}
