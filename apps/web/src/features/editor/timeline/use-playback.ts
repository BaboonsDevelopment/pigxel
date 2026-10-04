"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { SpriteApi } from "../pixel-canvas/use-sprite";
import { playSequence, tagSequence, type PlayMode } from "@/lib/sprite/tags";

export type Playback = ReturnType<typeof usePlayback>;

export function usePlayback(sprite: SpriteApi) {
  const [playing, setPlaying] = useState(false);
  const [tagId, setTagId] = useState<string | null>(null);
  const [mode, setMode] = useState<PlayMode>("loop");
  const [speed, setSpeed] = useState(1);
  const tag = sprite.tags.find((item) => item.id === tagId);
  const sequence = tag
    ? tagSequence(tag)
    : playSequence(sprite.frames.length, mode);
  const repeat = tag ? tag.repeat : mode === "once" ? 1 : 0;
  const playhead = useRef({ index: 0, cycles: 0 });
  const canPlay = sequence.length > 1;
  const current = sprite.frames.findIndex((f) => f.id === sprite.frameId);
  const duration = sprite.frames[current]?.duration;
  const advance = useEffectEvent(() => {
    if (sequence[playhead.current.index] !== current)
      playhead.current.index = Math.max(0, sequence.indexOf(current));
    const next = playhead.current.index + 1;
    if (next >= sequence.length) {
      playhead.current.cycles++;
      if (repeat && playhead.current.cycles >= repeat) {
        setPlaying(false);
        return;
      }
      playhead.current.index = 0;
    } else playhead.current.index = next;
    sprite.selectFrame(sprite.frames[sequence[playhead.current.index]!]!.id);
  });

  useEffect(() => {
    if (!playing || !canPlay || duration === undefined) return;
    const timer = setTimeout(() => advance(), duration / speed);
    return () => clearTimeout(timer);
  }, [playing, canPlay, sprite.frameId, duration, speed]);

  const start = () => {
    const at = tag ? 0 : sequence.indexOf(current);
    const index =
      mode === "once" && at === sequence.length - 1 ? 0 : Math.max(0, at);
    playhead.current = { index, cycles: 0 };
    sprite.selectFrame(sprite.frames[sequence[index]!]!.id);
    setPlaying(true);
  };

  return {
    playing: playing && canPlay,
    canPlay,
    tagId: tag?.id ?? null,
    mode,
    speed,
    setMode: (next: PlayMode) => {
      setMode(next);
      setPlaying(false);
    },
    setSpeed,
    selectTag: (id: string | null) => {
      setPlaying(false);
      setTagId(id);
      playhead.current = { index: 0, cycles: 0 };
      const selected = sprite.tags.find((item) => item.id === id);
      if (selected)
        sprite.selectFrame(sprite.frames[tagSequence(selected)[0]!]!.id);
    },
    toggle: () => (playing ? setPlaying(false) : start()),
    play: () => {
      if (!playing) start();
    },
  };
}
