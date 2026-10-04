"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { SpriteApi } from "../pixel-canvas/use-sprite";
import { tagSequence } from "@/lib/sprite/tags";

export type Playback = ReturnType<typeof usePlayback>;

export function usePlayback(sprite: SpriteApi) {
  const [playing, setPlaying] = useState(false);
  const [tagId, setTagId] = useState<string | null>(null);
  const tag = sprite.tags.find((item) => item.id === tagId);
  const sequence = tag ? tagSequence(tag) : null;
  const playhead = useRef({ index: 0, cycles: 0 });
  const canPlay = (sequence?.length ?? sprite.frames.length) > 1;
  const duration = sprite.frames.find((f) => f.id === sprite.frameId)?.duration;
  const advance = useEffectEvent(() => {
    if (!tag || !sequence) {
      sprite.stepFrame(1);
      return;
    }
    const next = playhead.current.index + 1;
    if (next >= sequence.length) {
      playhead.current.cycles++;
      if (tag.repeat && playhead.current.cycles >= tag.repeat) {
        setPlaying(false);
        return;
      }
      playhead.current.index = 0;
    } else playhead.current.index = next;
    sprite.selectFrame(sprite.frames[sequence[playhead.current.index]!]!.id);
  });

  useEffect(() => {
    if (!playing || !canPlay) return;
    const timer = setTimeout(() => advance(), duration);
    return () => clearTimeout(timer);
  }, [playing, canPlay, sprite.frameId, duration]);

  return {
    playing: playing && canPlay,
    canPlay,
    tagId: tag?.id ?? null,
    selectTag: (id: string | null) => {
      setPlaying(false);
      setTagId(id);
      playhead.current = { index: 0, cycles: 0 };
      const selected = sprite.tags.find((item) => item.id === id);
      if (selected)
        sprite.selectFrame(sprite.frames[tagSequence(selected)[0]!]!.id);
    },
    toggle: () => {
      if (!playing && tag && sequence) {
        playhead.current = { index: 0, cycles: 0 };
        sprite.selectFrame(sprite.frames[sequence[0]!]!.id);
      }
      setPlaying((p) => !p);
    },
    play: () => setPlaying(true),
  };
}
