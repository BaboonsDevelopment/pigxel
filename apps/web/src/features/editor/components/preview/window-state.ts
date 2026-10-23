type PreviewBox = { x: number; y: number; w: number; h: number };
export const PREVIEW_MIN = { w: 160, h: 120 };
const key = (userId: string) => `pigxel:preview-window:v1:${userId}`;
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function fitPreviewBox(
  box: PreviewBox,
  width: number,
  height: number,
): PreviewBox {
  const w = clamp(box.w, Math.min(PREVIEW_MIN.w, width), width);
  const h = clamp(box.h, Math.min(PREVIEW_MIN.h, height), height);
  return {
    w,
    h,
    x: clamp(box.x, 0, width - w),
    y: clamp(box.y, 0, height - h),
  };
}

export function readPreviewBox(userId: string): PreviewBox {
  const fallback = {
    x: Math.max(8, window.innerWidth - 284),
    y: 120,
    w: 260,
    h: 240,
  };
  let box = fallback;
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(key(userId)) ?? "null",
    );
    if (saved && typeof saved === "object") {
      const value = saved as Record<string, unknown>;
      if (
        ["x", "y", "w", "h"].every(
          (field) =>
            typeof value[field] === "number" && Number.isFinite(value[field]),
        ) &&
        (value.w as number) > 0 &&
        (value.h as number) > 0
      )
        box = value as PreviewBox;
    }
  } catch {
    /* Use the default when storage is unavailable or invalid. */
  }
  return fitPreviewBox(box, window.innerWidth, window.innerHeight);
}

export function writePreviewBox(userId: string, box: PreviewBox) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(box));
  } catch {
    /* The preview still works when persistence is unavailable. */
  }
}
