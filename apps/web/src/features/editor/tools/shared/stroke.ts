import {
  blendInk,
  paintPoints,
  paintStamp,
  rgbaOf,
  shadingInk,
  type Ink,
  type Rgba,
  type Stamp,
} from "@/components/pixel-canvas/paint";
import {
  brushOrigin,
  brushTip,
  clampOpacity,
  type ColorSlot,
  type Point,
} from "@/components/pixel-canvas/pen";
import { polygonMask } from "@/components/pixel-canvas/selection";
import type { Size } from "@/components/pixel-canvas/constants";
import type { CanvasPointer, ToolContext } from "../types";
import { tipRects } from "./tips";

export type Stroke = {
  points: Point[];
  end: Point;
  rgba: Rgba;
  secondary: boolean;
  color: string | null;
  before: Uint8ClampedArray;
  seed: number;
};

export type StrokeInk = (stroke: Stroke, props: ToolContext) => Ink;

export type StrokeCanvas = {
  stroke: Stroke;
  data: Uint8ClampedArray;
  paint: (points: Point[], thin?: boolean) => void;
  stamp: (stamp: Stamp) => void;
};

export type StrokeRender = (canvas: StrokeCanvas) => void;

export const slotOf = (e: CanvasPointer): ColorSlot =>
  e.button === 2 ? "secondary" : "primary";

export const colorInk: StrokeInk = (stroke) => stroke.rgba;

export const penInk: StrokeInk = (stroke, { pen, sprite }) =>
  pen.ink === "shading"
    ? shadingInk(stroke.before, sprite.palette, stroke.secondary ? -1 : 1)
    : blendInk(
        stroke.before,
        [
          stroke.rgba[0],
          stroke.rgba[1],
          stroke.rgba[2],
          clampOpacity(pen.opacity),
        ],
        pen.ink,
      );

export function inkColor(
  { pen, sprite }: ToolContext,
  slot: ColorSlot,
  erase = false,
) {
  const color = erase ? null : slot === "primary" ? pen.color : pen.secondary;
  const rgba: Rgba = color
    ? rgbaOf(color)
    : sprite.eraseFill
      ? rgbaOf(sprite.eraseFill)
      : [0, 0, 0, 0];
  return { color, rgba };
}

export function startStroke(
  props: ToolContext,
  e: CanvasPointer,
  point: Point,
  {
    points = [point],
    erase = false,
    keepsColor = true,
  }: { points?: Point[]; erase?: boolean; keepsColor?: boolean } = {},
): Stroke | null {
  const { selection, sprite } = props;
  selection.drop();
  const ctx = sprite.context(true);
  if (!ctx) return null;
  const slot = slotOf(e);
  const { color, rgba } = inkColor(props, slot, erase);
  e.currentTarget.setPointerCapture(e.pointerId);
  return {
    points,
    end: point,
    rgba,
    secondary: slot === "secondary",
    color: keepsColor ? color : null,
    before: new Uint8ClampedArray(
      ctx.getImageData(0, 0, sprite.size.w, sprite.size.h).data,
    ),
    seed: (Math.random() * 2 ** 31) | 0,
  };
}

export function drawStroke(
  props: ToolContext,
  stroke: Stroke,
  ink: StrokeInk,
  render: StrokeRender,
) {
  const { tool, pen, sprite, paintOptions } = props;
  const ctx = sprite.context();
  if (!ctx) return;
  const data = new Uint8ClampedArray(stroke.before);
  const tip = tool.tip?.(pen) ?? null;
  const tipPixels = tip?.size ?? 1;
  const rects = tipRects(tip, pen.brushAngle);
  const origin = (p: Point) => brushOrigin(p, tipPixels);
  const strokeInk = ink(stroke, props);
  render({
    stroke,
    data,
    paint: (points, thin = false) =>
      paintPoints(
        data,
        points,
        thin ? brushTip(1, false) : rects,
        thin ? (p) => p : origin,
        strokeInk,
        paintOptions,
      ),
    stamp: (stamp) =>
      paintStamp(
        data,
        stroke.points,
        stamp,
        stroke.secondary ? stroke.rgba : null,
        paintOptions,
      ),
  });
  ctx.putImageData(
    new ImageData(data as Uint8ClampedArray<ArrayBuffer>, sprite.size.w),
    0,
    0,
  );
  sprite.touched();
}

export function finishStroke(
  { sprite, lastPointRef, onUseColor }: ToolContext,
  stroke: Stroke,
  last: Point | null,
) {
  lastPointRef.current = last;
  sprite.commit();
  if (stroke.color) onUseColor?.(stroke.color);
}

export function cancelStroke({ sprite }: ToolContext, stroke: Stroke) {
  const ctx = sprite.context();
  if (!ctx) return;
  ctx.putImageData(
    new ImageData(
      stroke.before as Uint8ClampedArray<ArrayBuffer>,
      sprite.size.w,
    ),
    0,
    0,
  );
  sprite.touched();
}

export function polygonPixels(size: Size, corners: Point[]): Point[] {
  const points: Point[] = [];
  polygonMask(size, corners).forEach((on, i) => {
    if (on) points.push({ x: i % size.w, y: Math.floor(i / size.w) });
  });
  return points;
}
