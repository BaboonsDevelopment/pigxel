export function lockedAlpha(
  before: Uint8ClampedArray | undefined,
  after: Uint8ClampedArray,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(after.length);
  if (!before) return out;
  for (let i = 0; i < out.length; i += 4) {
    const alpha = before[i + 3]!;
    if (!alpha || !after[i + 3]) {
      out.set(before.subarray(i, i + 4), i);
      continue;
    }
    out[i] = after[i]!;
    out[i + 1] = after[i + 1]!;
    out[i + 2] = after[i + 2]!;
    out[i + 3] = alpha;
  }
  return out;
}
