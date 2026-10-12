"use client";

import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { rgbaOf, type Rgba } from "../../pixel-canvas/paint";
import type { Point } from "../../pixel-canvas/pen";
import type { Floating } from "../../pixel-canvas/selection";
import { textPiece } from "../../pixel-canvas/text";
import { slotOf } from "../shared/stroke";
import { allLayers, canPaint, isShown } from "@/lib/layers/tree";
import { replaceInlineText, type InlineText } from "@/lib/layers/text";
import type { ToolCanvasProps } from "../types";
import { isCustomFont } from "../../pixel-canvas/text-fonts";
import { useCustomFonts } from "./fonts";

const NO_GLYPHS =
  "This font has none of these letters. For Cyrillic, pick Tiny5, DotGothic16 or Press Start 2P.";
const MISSING_FONT =
  "This text uses a font that isn’t in your fonts. Pick another font to edit it.";

export function TextCanvas({
  ref,
  pen,
  selection,
  scale,
  onTextPlaced,
  onTextStyle,
  sprite,
}: ToolCanvasProps) {
  const [box, setBox] = useState<{
    at: Point;
    rgba: Rgba;
    text: string;
    layerId?: string;
    textId?: string;
    legacy?: InlineText;
    frameId: string;
    before?: Uint8ClampedArray;
  } | null>(null);
  const [preview, setPreview] = useState<Floating | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const fonts = useCustomFonts();
  const noGlyphs =
    isCustomFont(pen.textFont) &&
    fonts.data &&
    !fonts.data.some((font) => font.id === pen.textFont)
      ? MISSING_FONT
      : NO_GLYPHS;
  const latestSprite = useRef(sprite);
  useLayoutEffect(() => {
    latestSprite.current = sprite;
  });
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );

  const spacing = {
    letter: pen.textLetterSpacing,
    line: pen.textLineSpacing,
  };

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
      { letter: pen.textLetterSpacing, line: pen.textLineSpacing },
    ).then((piece) => {
      if (live) setPreview(piece);
    });
    return () => {
      live = false;
    };
  }, [
    box,
    pen.textFont,
    pen.textScale,
    pen.textLetterSpacing,
    pen.textLineSpacing,
  ]);

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
      spacing,
    );
    if (!piece) return setError(noGlyphs);
    const currentSprite = latestSprite.current;
    if (currentSprite.frameId !== box.frameId)
      return setError("Return to the original frame to edit this text.");
    if (box.layerId && box.before) {
      const now = currentSprite.readCel(box.layerId, box.frameId);
      if (
        now.length !== box.before.length ||
        !box.before.every((value, i) => value === now[i])
      ) {
        return setError(
          "This layer changed while editing. Cancel and reopen the text.",
        );
      }
    }
    selection.deselect();
    if (
      !currentSprite.placeText(
        piece,
        {
          value: box.text,
          font: pen.textFont,
          scale: pen.textScale,
          ...(pen.textLetterSpacing && {
            letterSpacing: pen.textLetterSpacing,
          }),
          ...(pen.textLineSpacing && { lineSpacing: pen.textLineSpacing }),
          rgba: box.rgba,
          x: box.at.x,
          y: box.at.y,
        },
        box.layerId,
        box.textId,
        box.legacy,
      )
    )
      return setError("Pick a visible, unlocked layer to put the text on.");
    setBox(null);
    setPreview(null);
    onTextPlaced?.();
  };

  useImperativeHandle(ref, () => ({
    async down(e, point) {
      e.preventDefault();
      const ticket = ++request.current;
      for (const layer of allLayers(sprite.tree).reverse()) {
        if (
          (layer.kind !== "normal" && layer.kind !== "background") ||
          !isShown(sprite.tree, layer.id) ||
          !canPaint(sprite.tree, layer.id)
        )
          continue;
        const objects = [...(layer.textObjects?.[sprite.frameId] ?? [])];
        const old = layer.texts?.[sprite.frameId];
        let legacy: InlineText | undefined;
        if (old) {
          const piece = await textPiece(
            old.value,
            old.font,
            old.scale,
            old.rgba,
            old.x,
            old.y,
            { letter: old.letterSpacing, line: old.lineSpacing },
          );
          if (
            ticket !== request.current ||
            latestSprite.current.frameId !== sprite.frameId
          )
            return;
          if (piece) {
            legacy = replaceInlineText(
              new Uint8ClampedArray(sprite.size.w * sprite.size.h * 4),
              sprite.size,
              piece,
              old,
            ).record;
            legacy.id = `legacy:${sprite.frameId}`;
            objects.unshift(legacy);
          }
        }
        for (const text of objects.reverse()) {
          if (
            point.x < text.x ||
            point.y < text.y ||
            point.x >= text.x + text.w ||
            point.y >= text.y + text.h
          )
            continue;
          if (ticket !== request.current) return;
          const position = { x: text.x, y: text.y };
          sprite.selectLayer(layer.id);
          onTextStyle?.({
            textFont: text.font,
            textScale: text.scale,
            textLetterSpacing: text.letterSpacing ?? 0,
            textLineSpacing: text.lineSpacing ?? 0,
          });
          setError(null);
          setBox({
            at: position,
            rgba: text.rgba,
            text: text.value,
            layerId: layer.id,
            textId: text.id,
            legacy: text === legacy ? legacy : undefined,
            frameId: sprite.frameId,
            before: new Uint8ClampedArray(
              sprite.readCel(layer.id, sprite.frameId),
            ),
          });
          return;
        }
      }
      const rgba = rgbaOf(slotOf(e) === "primary" ? pen.color : pen.secondary);
      setError(null);
      setPreview(null);
      setBox({
        at: point,
        rgba,
        text: "",
        frameId: sprite.frameId,
      });
    },
  }));

  if (!box) return null;
  const message = error ?? (box.text.trim() && !preview ? noGlyphs : null);
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
      <div
        className="absolute z-10 w-56 rounded-md border bg-background p-2 text-sm text-foreground shadow-md"
        style={{
          left: box.at.x * scale,
          top: (box.at.y + (preview?.h ?? 0)) * scale + 6,
        }}
      >
        <textarea
          ref={input}
          aria-label="Text"
          placeholder="Type text. Enter adds a line."
          rows={3}
          value={box.text}
          onChange={(e) => {
            setBox({ ...box, text: e.target.value });
            setError(null);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void place();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setBox(null);
              setPreview(null);
              setError(null);
            }
          }}
          className="block w-full resize-none rounded border bg-background p-1 text-sm"
        />
        <div className="mt-1 flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Ctrl/⌘ + Enter to place</span>
          <button
            type="button"
            disabled={!box.text.trim()}
            onClick={() => void place()}
            className="rounded border px-2 py-1 hover:bg-muted disabled:opacity-40"
          >
            {box.layerId ? "Update" : "Place"}
          </button>
        </div>
      </div>
      {message && (
        <p
          role="status"
          className="absolute z-10 w-56 rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md"
          style={{
            left: box.at.x * scale,
            top: (box.at.y + (preview?.h ?? 0)) * scale + 124,
          }}
        >
          {message}
        </p>
      )}
    </>
  );
}
