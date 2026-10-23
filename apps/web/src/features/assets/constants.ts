const ASSET_TINTS = [
  "bg-pastel-pink",
  "bg-pastel-peach",
  "bg-pastel-mint",
  "bg-pastel-lavender",
];

export const ASSET_BACKGROUNDS = [
  "#f6d5dc",
  "#fbe3cf",
  "#fdf0c4",
  "#d8efd3",
  "#cfe8ec",
  "#d9e2f7",
  "#e5dbf5",
  "#f3dcef",
  "#efe6da",
  "#e4e7eb",
  "#c94f6d",
  "#e07a3f",
  "#d9a440",
  "#4f9a5e",
  "#2f8f9d",
  "#3f63b8",
  "#7a4fb0",
  "#3a3f4b",
  "#262b44",
  "#181425",
];

export const isAssetBackground = (value: unknown): value is string =>
  typeof value === "string" && ASSET_BACKGROUNDS.includes(value);

export const assetTint = (index: number) =>
  ASSET_TINTS[index % ASSET_TINTS.length]!;
