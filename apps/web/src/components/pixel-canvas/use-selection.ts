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

/** Selected pixels lifted off the active cel, not yet dropped back. */
type Lifted = {
  piece: Floating;
  /** The cel without the piece. */
  under: Uint8ClampedArray;
  frameId: string;
  layerId: string;
  /** The selection before lifting, for when the lift is cancelled. */
  maskBefore: Mask | null;
  /** Whether the cel shows a change yet; a lift alone changes nothing. */
  shown?: boolean;
  /**
   * While scaling or turning: the piece as lifted and how it is transformed;
   * `piece` is always worked out from these, so it never blurs.
   */
  source?: { piece: Floating; t: FreeTransform };
};

// Kept for the whole visit, so a copy can be pasted into another tile.
let clipboard: Floating | null = null;

// Selections saved with "Save selection", per tile, for the whole visit.
const savedSelections = new Map<string, Mask>();

/** A floating piece as a PNG, for other apps. */
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

/** Also puts a copy on the system clipboard as a picture, where the browser allows it. */
function copyToSystem(piece: Floating) {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write)
    return;
  navigator.clipboard
    .write([new ClipboardItem({ "image/png": pngOf(piece).then((b) => b!) })])
    .catch(() => {
      // Pasting inside Pigxel still works from our own copy.
    });
}

/**
 * The picture to paste: our own copy (which remembers where it came from)
 * when `image` is that same copy coming back from the system clipboard, or
 * `image` from another app, placed at the top-left.
 */
export function pasteSource(image: Floating | null): Floating | null {
  if (!image) return clipboard;
  if (clipboard && clipboard.w === image.w && clipboard.h === image.h)
    return clipboard;
  return image;
}

/**
 * The selection on a tile, as in Aseprite: a mask of selected pixels that
 * limits the drawing tools, and can be moved, flipped, rotated, copied, cut
 * and pasted. Moving or transforming lifts the pixels into a floating piece;
 * it is dropped back (one undo step) when something else happens: drawing,
 * selecting, another layer or frame, Enter.
 */
export function useSelection(sprite: SpriteApi) {
  const { size } = sprite;
  const [ownMask, setMask] = useState<Mask | null>(null);
  const [lifted, setLifted] = useState<Lifted | null>(null);
  // The selection before the last one replaced or cleared it, for Reselect.
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
  /** What is selected now: the floating piece, or the mask. */
  const mask = fitting(lifted ? floatingMask(lifted.piece, size) : ownMask);

  const celPixels = () => sprite.readCel(sprite.layerId, sprite.frameId);
  const fill = () => (sprite.eraseFill ? rgbaOf(sprite.eraseFill) : null);

  /** Puts pixels on the active cel without recording a change yet. */
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

  /** Drops the floating piece where it is, as one undo step; the selection stays on it. */
  const drop = () => {
    if (!lifted) return;
    if (lifted.shown) sprite.commit();
    setMask(floatingMask(lifted.piece, size));
    setLifted(null);
  };

  /** Lifts the selected pixels (every pixel with `whole`) off the active cel. */
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

  // The piece belongs to the cel it came from: drop it before leaving it.
  useLayoutEffect(() => sprite.onLeaveCel(drop));

  /** The selected pixels (the whole cel when nothing is selected) as a piece. */
  const selectedPiece = () =>
    lifted?.piece ??
    liftPixels(
      celPixels(),
      size,
      mask ?? new Uint8Array(size.w * size.h).fill(1),
      null,
    )?.floating ??
    null;

  /** Shows `current`'s piece as lifted, transformed by `t`. */
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
    /** The selected pixels, one byte per tile pixel; null when nothing is selected. */
    mask,
    /** Whether pixels are lifted and waiting to be dropped. */
    floating: lifted !== null,
    select,
    selectAll: () => select(new Uint8Array(size.w * size.h).fill(1)),
    deselect: () => select(null),
    /** Whether Reselect has a selection to bring back. */
    canReselect: fitting(previous) !== null,
    /** Brings back the selection that was cleared or replaced last. */
    reselect: () => {
      const back = fitting(previous);
      if (back) select(back);
    },
    /** Whether a selection was saved for this tile (and still fits it). */
    hasSaved: fitting(saved) !== null,
    /** Keeps the selection to load later, while the page is open. */
    saveSelection: () => {
      if (!mask) return;
      const copy = new Uint8Array(mask);
      savedSelections.set(sprite.id, copy);
      setSaved(copy);
    },
    /** Selects the saved selection again. */
    loadSelection: () => {
      const back = fitting(saved);
      if (back) select(new Uint8Array(back));
    },
    invert: () => {
      drop();
      setMask(invertMask(mask, size));
    },
    drop,

    /** Cancels a lift or paste: the pixels go back and the selection is as before. */
    cancel() {
      if (!lifted) return false;
      sprite.revert();
      setMask(lifted.maskBefore);
      setLifted(null);
      return true;
    },

    /**
     * Starts dragging the selected pixels, or with `whole` (the Move tool with
     * nothing selected) the whole cel; false when there is nothing to move.
     */
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
    /** Moves the dragged pixels `dx, dy` tile pixels from where the drag started. */
    moveTo(dx: number, dy: number) {
      const from = dragFrom.current;
      if (!from || !lifted) return;
      const { piece } = lifted;
      if (piece.x === from.x + dx && piece.y === from.y + dy) return;
      // Moving a transformed piece moves its centre, the rest stays.
      if (lifted.source && from.t)
        return transformTo(lifted, {
          ...from.t,
          cx: from.t.cx + dx,
          cy: from.t.cy + dy,
        });
      place({ ...lifted, piece: { ...piece, x: from.x + dx, y: from.y + dy } });
    },
    /** Ends a drag; moving a whole cel drops it at once and selects nothing. */
    endMove() {
      const from = dragFrom.current;
      dragFrom.current = null;
      if (!from?.whole || !lifted) return;
      if (lifted.shown) sprite.commit();
      setLifted(null);
      setMask(lifted.maskBefore);
    },

    /** Moves the selected pixels one step, e.g. with the arrow keys. */
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

    /** Flips or turns the selected pixels, or the whole cel when nothing is selected. */
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
      // A flip or quarter turn bakes in any scaling or turning so far.
      if (!whole) return place({ ...current, piece, source: undefined });
      show(stampFloating(current.under, size, piece));
      sprite.commit();
      setLifted(null);
    },

    /**
     * The scale, turn and slant of the selected pixels, with the size they
     * were lifted at; null while nothing is transformed yet.
     */
    freeTransform: lifted?.source
      ? {
          t: lifted.source.t,
          w: lifted.source.piece.w,
          h: lifted.source.piece.h,
        }
      : null,

    /**
     * Starts scaling or turning the selected pixels: lifts them and returns
     * the transform so far, with their lifted size; null when nothing can be.
     */
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

    /** Scales, turns or slants the selected pixels to `t` (see beginTransform). */
    setTransform(t: FreeTransform) {
      const current = lift();
      if (current) transformTo(current, t);
    },

    /** Removes the selected pixels, leaving the selection. */
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

    /** Copies the selected pixels (the whole cel when nothing is selected). */
    copy() {
      const piece = selectedPiece();
      if (!piece) return false;
      clipboard = piece;
      copyToSystem(piece);
      return true;
    },

    /** The selected pixels as a picture, e.g. to use as the brush. */
    selectedPiece,

    /**
     * Pastes the last copy as a floating piece where it was copied from
     * (kept on the tile); false when there is nothing to paste or no layer
     * to paste on.
     */
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
