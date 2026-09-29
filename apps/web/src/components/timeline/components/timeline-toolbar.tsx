"use client";

import { useRef } from "react";
import type { SpriteApi } from "@/components/pixel-canvas/use-sprite";
import { fitImageToTile } from "@/lib/image/helpers";
import { ACTION } from "../constants";
import { ICONS } from "../icons";
import type { Playback } from "../use-playback";
import { FrameDuration } from "./frame-duration";
import { LayerOptions } from "./layer-options";

/**
 * The timeline's buttons: layers (add, group, reference, remove), frames
 * (play, step, add, duplicate, remove, duration) and the active layer's
 * opacity and blend mode.
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
  const pictureInput = useRef<HTMLInputElement>(null);
  const { activeLayer, layerId, frames, frameId } = sprite;
  const frame = frames.find((f) => f.id === frameId)!;

  const addReference = async (file: File | undefined) => {
    if (!file) return;
    const { w, h } = sprite.size;
    sprite.addLayer("reference", await fitImageToTile(file, w, h));
  };

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-2 py-1">
      <h2 className="px-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        Timeline
      </h2>
      <div className="flex items-center">
        <button
          type="button"
          className={ACTION}
          title="New layer (Shift+N)"
          onClick={() => sprite.addLayer("normal")}
        >
          {ICONS.add} Layer
        </button>
        <button
          type="button"
          className={ACTION}
          onClick={() => sprite.addLayer("group")}
        >
          {ICONS.group} Group
        </button>
        <button
          type="button"
          className={ACTION}
          title="A picture to trace over, in every frame; it isn’t drawn on or exported"
          onClick={() => pictureInput.current?.click()}
        >
          {ICONS.reference} Reference…
        </button>
        <button
          type="button"
          className={ACTION}
          title="Remove layer"
          disabled={!sprite.canRemoveLayer(layerId)}
          onClick={() => sprite.removeLayer(layerId)}
        >
          {ICONS.remove}
        </button>
      </div>

      <div className="flex items-center">
        <button
          type="button"
          className={ACTION}
          title="Previous frame (,)"
          disabled={frames.length < 2}
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
          disabled={frames.length < 2}
          onClick={() => sprite.stepFrame(1)}
        >
          {ICONS.next}
        </button>
        <button
          type="button"
          className={ACTION}
          title="New empty frame after this one"
          onClick={() => sprite.addFrame(false)}
        >
          {ICONS.add} Frame
        </button>
        <button
          type="button"
          className={ACTION}
          title="Copy of this frame after it (Alt+N)"
          onClick={() => sprite.addFrame(true)}
        >
          {ICONS.duplicate} Duplicate
        </button>
        <button
          type="button"
          className={ACTION}
          title="Remove frame"
          disabled={frames.length < 2}
          onClick={() => sprite.removeFrame(frameId)}
        >
          {ICONS.remove}
        </button>
      </div>
      <FrameDuration
        key={`${frame.id}:${frame.duration}`}
        duration={frame.duration}
        onChange={(ms) => sprite.setFrameDuration(frame.id, ms)}
      />

      {activeLayer && (
        <LayerOptions
          key={activeLayer.id}
          layer={activeLayer}
          onChange={(patch) => sprite.updateLayer(activeLayer.id, patch)}
        />
      )}
      <button
        type="button"
        className={`${ACTION} ml-auto text-muted-foreground`}
        title="Hide the timeline"
        onClick={onCollapse}
      >
        {ICONS.collapse}
      </button>
      <input
        ref={pictureInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void addReference(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </header>
  );
}
