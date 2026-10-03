"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  identityTransform,
  transformFloating,
  type FreeTransform,
} from "./free-transform";
import { rgbaOf } from "./paint";
import {
  combineMasks,
  flipFloating,
  floatingMask,
  invertMask,
  liftPixels,
  rotateFloating,
  stampFloating,
  type Floating,
  type Mask,
  type SelectMode,
} from "./selection";
import type { SpriteApi } from "./use-sprite";

export type SelectionApi = ReturnType<typeof useSelection>;

export type Transform =
  "flipHorizontal" | "flipVertical" | "rotateRight" | "rotateLeft";

type Lifted = {
  piece: Floating;
  under: Uint8ClampedArray;
  frameId: string;
  layerId: string;
  maskBefore: Mask | null;
  shown?: boolean;
  source?: { piece: Floating; t: FreeTransform };
};

let clipboard: Floating | null = null;

const savedSelections = new Map<string, Mask>();

async function pngOf(piece: Floating): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = piece.w;
  canvas.height = piece.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const pixels = new Uint8ClampedArray(piece.pixels);
  for (let i = 0; i < piece.mask.length; i++)
    if (!piece.mask[i]) pixels[i * 4 + 3] = 0;
  ctx.putImageData(
    new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, piece.w, piece.h),
    0,
    0,
  );
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function copyToSystem(piece: Floating) {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write)
    return;
  navigator.clipboard
    .write([new ClipboardItem({ "image/png": pngOf(piece).then((b) => b!) })])
    .catch(() => {});
}

export function pasteSource(image: Floating | null): Floating | null {
  if (!image) return clipboard;
  if (clipboard && clipboard.w === image.w && clipboard.h === image.h)
    return clipboard;
  return image;
}

export function useSelection(sprite: SpriteApi) {
  const { size } = sprite;
  const [ownMask, setMask] = useState<Mask | null>(null);
  const [lifted, setLifted] = useState<Lifted | null>(null);
  const [previous, setPrevious] = useState<Mask | null>(null);
  const [saved, setSaved] = useState(
    () => savedSelections.get(sprite.id) ?? null,
  );
  const dragFrom = useRef<{
    x: number;
    y: number;
    whole: boolean;
    t?: FreeTransform;
  }>(null);

  const fitting = (mask: Mask | null) =>
    mask && mask.length === size.w * size.h ? mask : null;
  const mask = fitting(lifted ? floatingMask(lifted.piece, size) : ownMask);

  const celPixels = () => sprite.readCel(sprite.layerId, sprite.frameId);
  const fill = () => (sprite.eraseFill ? rgbaOf(sprite.eraseFill) : null);

  const show = (pixels: Uint8ClampedArray) => {
    const ctx = sprite.context(true);
    if (!ctx) return false;
    ctx.putImageData(
      new ImageData(
        new Uint8ClampedArray(pixels) as Uint8ClampedArray<ArrayBuffer>,
        size.w,
        size.h,
      ),
      0,
      0,
    );
    sprite.touched();
    return true;
  };

  const place = (next: Lifted) => {
    show(stampFloating(next.under, size, next.piece));
    setLifted({ ...next, shown: true });
  };

  const drop = () => {
    if (!lifted) return;
    if (lifted.shown) sprite.commit();
    setMask(floatingMask(lifted.piece, size));
    setLifted(null);
  };

  const lift = (whole = false): Lifted | null => {
    if (lifted) return lifted;
    if (!sprite.canPaint) return null;
    const from =
      whole || !mask ? new Uint8Array(size.w * size.h).fill(1) : mask;
    const result = liftPixels(celPixels(), size, from, fill());
    if (!result) return null;
    return {
      ...result,
      piece: result.floating,
      frameId: sprite.frameId,
      layerId: sprite.layerId,
      maskBefore: ownMask,
    };
  };

  useLayoutEffect(() => sprite.onLeaveCel(drop));

  const selectedPiece = () =>
    lifted?.piece ??
    liftPixels(
      celPixels(),
      size,
      mask ?? new Uint8Array(size.w * size.h).fill(1),
      null,
    )?.floating ??
    null;

  const transformTo = (current: Lifted, t: FreeTransform) => {
    const source = current.source?.piece ?? current.piece;
    place({
      ...current,
      source: { piece: source, t },
      piece: transformFloating(source, t),
    });
  };

  const select = (next: Mask | null, mode: SelectMode = "replace") => {
    drop();
    const result = next ? combineMasks(mask, next, mode) : null;
    if (mask && result !== mask) setPrevious(mask);
    setMask(result);
  };

  return {
    mask,
    floating: lifted !== null,
    select,
    selectAll: () => select(new Uint8Array(size.w * size.h).fill(1)),
    deselect: () => select(null),
    canReselect: fitting(previous) !== null,
    reselect: () => {
      const back = fitting(previous);
      if (back) select(back);
    },
    hasSaved: fitting(saved) !== null,
    saveSelection: () => {
      if (!mask) return;
      const copy = new Uint8Array(mask);
      savedSelections.set(sprite.id, copy);
      setSaved(copy);
    },
    loadSelection: () => {
      const back = fitting(saved);
      if (back) select(new Uint8Array(back));
    },
    invert: () => {
      drop();
      setMask(invertMask(mask, size));
    },
    drop,

    cancel() {
      if (!lifted) return false;
      sprite.revert();
      setMask(lifted.maskBefore);
      setLifted(null);
      return true;
    },

    beginMove(whole: boolean) {
      const current = lift(whole);
      if (!current) return false;
      dragFrom.current = {
        x: current.piece.x,
        y: current.piece.y,
        whole,
        t: current.source?.t,
      };
      setLifted(current);
      return true;
    },
    moveTo(dx: number, dy: number) {
      const from = dragFrom.current;
      if (!from || !lifted) return;
      const { piece } = lifted;
      if (piece.x === from.x + dx && piece.y === from.y + dy) return;
      if (lifted.source && from.t)
        return transformTo(lifted, {
          ...from.t,
          cx: from.t.cx + dx,
          cy: from.t.cy + dy,
        });
      place({ ...lifted, piece: { ...piece, x: from.x + dx, y: from.y + dy } });
    },
    endMove() {
      const from = dragFrom.current;
      dragFrom.current = null;
      if (!from?.whole || !lifted) return;
      if (lifted.shown) sprite.commit();
      setLifted(null);
      setMask(lifted.maskBefore);
    },

    nudge(dx: number, dy: number) {
      if (!mask) return false;
      const current = lift();
      if (!current) return false;
      const { piece, source } = current;
      if (source)
        transformTo(current, {
          ...source.t,
          cx: source.t.cx + dx,
          cy: source.t.cy + dy,
        });
      else
        place({
          ...current,
          piece: { ...piece, x: piece.x + dx, y: piece.y + dy },
        });
      return true;
    },

    transform(kind: Transform) {
      const whole = !mask;
      const current = lift(whole);
      if (!current) return;
      const piece =
        kind === "flipHorizontal"
          ? flipFloating(current.piece, "horizontal")
          : kind === "flipVertical"
            ? flipFloating(current.piece, "vertical")
            : rotateFloating(current.piece, kind === "rotateRight");
      if (!whole) return place({ ...current, piece, source: undefined });
      show(stampFloating(current.under, size, piece));
      sprite.commit();
      setLifted(null);
    },

    freeTransform: lifted?.source
      ? {
          t: lifted.source.t,
          w: lifted.source.piece.w,
          h: lifted.source.piece.h,
        }
      : null,

    beginTransform() {
      if (!mask) return null;
      const current = lift();
      if (!current) return null;
      if (!lifted) setLifted(current);
      const piece = current.source?.piece ?? current.piece;
      return {
        t: current.source?.t ?? identityTransform(piece),
        w: piece.w,
        h: piece.h,
      };
    },

    setTransform(t: FreeTransform) {
      const current = lift();
      if (current) transformTo(current, t);
    },

    clear() {
      if (lifted) {
        show(lifted.under);
        sprite.commit();
        setMask(floatingMask(lifted.piece, size));
        setLifted(null);
        return;
      }
      if (!mask || !sprite.canPaint) return;
      const result = liftPixels(celPixels(), size, mask, fill());
      if (result && show(result.under)) sprite.commit();
    },

    copy() {
      const piece = selectedPiece();
      if (!piece) return false;
      clipboard = piece;
      copyToSystem(piece);
      return true;
    },

    selectedPiece,

    paste(from: Floating | null = clipboard) {
      drop();
      if (!from || !sprite.canPaint) return false;
      const keepIn = (pos: number, len: number, max: number) =>
        len >= max ? 0 : Math.max(0, Math.min(max - len, pos));
      const piece = {
        ...from,
        x: keepIn(from.x, from.w, size.w),
        y: keepIn(from.y, from.h, size.h),
      };
      place({
        piece,
        under: new Uint8ClampedArray(celPixels()),
        frameId: sprite.frameId,
        layerId: sprite.layerId,
        maskBefore: mask,
      });
      return true;
    },
  };
}
