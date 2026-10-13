export const ASSET_TINTS = [
  "bg-pastel-pink",
  "bg-pastel-peach",
  "bg-pastel-mint",
  "bg-pastel-lavender",
];

export const assetTint = (index: number) =>
  ASSET_TINTS[index % ASSET_TINTS.length]!;
