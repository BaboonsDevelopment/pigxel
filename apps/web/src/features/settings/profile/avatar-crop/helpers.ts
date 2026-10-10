export const AVATAR_SIDE = 256;
export const CROP_BOX = 280;
export const MAX_ZOOM = 6;

export type Crop = { x: number; y: number; zoom: number };

export function coverScale(width: number, height: number) {
  return CROP_BOX / Math.min(width, height);
}

export function clampCrop(crop: Crop, width: number, height: number): Crop {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, crop.zoom));
  const scale = coverScale(width, height) * zoom;
  return {
    zoom,
    x: Math.min(0, Math.max(CROP_BOX - width * scale, crop.x)),
    y: Math.min(0, Math.max(CROP_BOX - height * scale, crop.y)),
  };
}

export function centeredCrop(width: number, height: number): Crop {
  const scale = coverScale(width, height);
  return {
    zoom: 1,
    x: (CROP_BOX - width * scale) / 2,
    y: (CROP_BOX - height * scale) / 2,
  };
}

export function zoomAround(
  crop: Crop,
  zoom: number,
  width: number,
  height: number,
  at = { x: CROP_BOX / 2, y: CROP_BOX / 2 },
): Crop {
  const next = Math.min(MAX_ZOOM, Math.max(1, zoom));
  const ratio = next / crop.zoom;
  return clampCrop(
    {
      zoom: next,
      x: at.x - (at.x - crop.x) * ratio,
      y: at.y - (at.y - crop.y) * ratio,
    },
    width,
    height,
  );
}

export async function croppedPng(
  bitmap: ImageBitmap,
  crop: Crop,
): Promise<Blob> {
  const scale = coverScale(bitmap.width, bitmap.height) * crop.zoom;
  const side = CROP_BOX / scale;
  const out =
    side >= AVATAR_SIDE
      ? AVATAR_SIDE
      : Math.round(side) * Math.max(1, Math.floor(AVATAR_SIDE / side));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.imageSmoothingEnabled = side > AVATAR_SIDE;
  ctx.drawImage(
    bitmap,
    -crop.x / scale,
    -crop.y / scale,
    side,
    side,
    0,
    0,
    out,
    out,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("no image"))),
      "image/png",
    ),
  );
}
