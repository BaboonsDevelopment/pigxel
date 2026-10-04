/** How many items a "Show more" list shows, from its `?shown=` parameter. */
export function shownFrom(value: string | undefined, step: number, steps = 20) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= step) return step;
  return Math.min(step * steps, Math.ceil(n / step) * step);
}
