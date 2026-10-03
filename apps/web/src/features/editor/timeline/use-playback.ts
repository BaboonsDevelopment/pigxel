"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { SpriteApi } from "@/components/pixel-canvas/use-sprite";

export type Playback = ReturnType<typeof usePlayback>;

export function usePlayback(sprite: SpriteApi) {
  const [playing, setPlaying] = useState(false);
  const canPlay = sprite.frames.length > 1;
  const duration = sprite.frames.find((f) => f.id === sprite.frameId)?.duration;
  const advance = useEffectEvent(() => sprite.stepFrame(1));

  useEffect(() => {
    if (!playing || !canPlay) return;
    const timer = setTimeout(() => advance(), duration);
    return () => clearTimeout(timer);
  }, [playing, canPlay, sprite.frameId, duration]);

  return {
    playing: playing && canPlay,
    canPlay,
    toggle: () => setPlaying((p) => !p),
    play: () => setPlaying(true),
  };
}
