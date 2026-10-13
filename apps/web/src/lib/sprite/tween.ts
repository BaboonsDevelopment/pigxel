export const TWEEN_EASES = [
  { value: "linear", label: "Even" },
  { value: "in", label: "Speed up" },
  { value: "out", label: "Slow down" },
  { value: "inOut", label: "Speed up, then slow down" },
] as const;

export type TweenEase = (typeof TWEEN_EASES)[number]["value"];

export const MAX_TWEEN_FRAMES = 60;

const eased = (ease: TweenEase, t: number) =>
  ease === "in"
    ? t * t
    : ease === "out"
      ? 1 - (1 - t) * (1 - t)
      : ease === "inOut"
        ? t < 0.5
          ? 2 * t * t
          : 1 - 2 * (1 - t) * (1 - t)
        : t;

export function tweenOffsets(
  dx: number,
  dy: number,
  between: number,
  ease: TweenEase,
  withEnd: boolean,
): { x: number; y: number }[] {
  const steps = between + 1;
  return Array.from({ length: between + (withEnd ? 1 : 0) }, (_, i) => {
    const t = eased(ease, (i + 1) / steps);
    return { x: Math.round(dx * t), y: Math.round(dy * t) };
  });
}
