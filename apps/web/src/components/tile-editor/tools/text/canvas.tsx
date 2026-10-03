"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { rgbaOf, type Rgba } from "@/components/pixel-canvas/paint";
import type { Point } from "@/components/pixel-canvas/pen";
import type { Floating } from "@/components/pixel-canvas/selection";
import { textPiece } from "@/components/pixel-canvas/text";
import { slotOf } from "../shared/stroke";
import type { ToolCanvasProps } from "../types";

const NO_GLYPHS =
  "This font has none of these letters. For Cyrillic, pick Tiny5, DotGothic16 or Press Start 2P.";

export function TextCanvas({
  ref,
  pen,
  selection,
  scale,
  onTextPlaced,
}: ToolCanvasProps) {
  const [box, setBox] = useState<{
    at: Point;
    rgba: Rgba;
    text: string;
  } | null>(null);
  const [preview, setPreview] = useState<Floating | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!box) return;
    let live = true;
    void textPiece(
      box.text,
      pen.textFont,
      pen.textScale,
      box.rgba,
      box.at.x,
      box.at.y,
    ).then((piece) => {
      if (live) setPreview(piece);
    });
    return () => {
      live = false;
    };
  }, [box, pen.textFont, pen.textScale]);

  const at = box?.at;
  useEffect(() => input.current?.focus(), [at]);

  const place = async () => {
    if (!box) return;
    const piece = await textPiece(
      box.text,
      pen.textFont,
      pen.textScale,
      box.rgba,
      box.at.x,
      box.at.y,
    );
    if (!piece) return setError(NO_GLYPHS);
    if (!selection.paste(piece))
      return setError("Pick a visible, unlocked layer to put the text on.");
    setBox(null);
    setPreview(null);
    onTextPlaced?.();
  };

  useImperativeHandle(ref, () => ({
    down(e, point) {
      e.preventDefault();
      const rgba = rgbaOf(slotOf(e) === "primary" ? pen.color : pen.secondary);
      setError(null);
      setBox((current) => ({ at: point, rgba, text: current?.text ?? "" }));
    },
  }));

  if (!box) return null;
  const message = error ?? (box.text.trim() && !preview ? NO_GLYPHS : null);
  return (
    <>
      {preview && (
        <canvas
          aria-hidden="true"
          width={preview.w}
          height={preview.h}
          className="pointer-events-none absolute outline-1 outline-blue-500 outline-dashed [image-rendering:pixelated]"
          style={{
            left: box.at.x * scale,
            top: box.at.y * scale,
            width: preview.w * scale,
            height: preview.h * scale,
          }}
          ref={(canvas) =>
            canvas
              ?.getContext("2d")
              ?.putImageData(
                new ImageData(
                  preview.pixels as Uint8ClampedArray<ArrayBuffer>,
                  preview.w,
                  preview.h,
                ),
                0,
                0,
              )
          }
        />
      )}
      <input
        ref={input}
        aria-label="Text"
        placeholder="Type, then Enter"
        value={box.text}
        onChange={(e) => {
          setBox({ ...box, text: e.target.value });
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") void place();
          if (e.key === "Escape") {
            setBox(null);
            setPreview(null);
            setError(null);
          }
        }}
        className="absolute z-10 h-7 w-44 rounded-md border bg-background px-2 text-sm text-foreground shadow-md"
        style={{
          left: box.at.x * scale,
          top: (box.at.y + (preview?.h ?? 0)) * scale + 6,
        }}
      />
      {message && (
        <p
          role="status"
          className="absolute z-10 w-56 rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md"
          style={{
            left: box.at.x * scale,
            top: (box.at.y + (preview?.h ?? 0)) * scale + 40,
          }}
        >
          {message}
        </p>
      )}
    </>
  );
}
