export const MAX_OPACITY = 255;

export const BLEND_MODES = [
  { id: "normal", label: "Normal" },
  { id: "multiply", label: "Multiply" },
  { id: "screen", label: "Screen" },
  { id: "overlay", label: "Overlay" },
  { id: "darken", label: "Darken" },
  { id: "lighten", label: "Lighten" },
  { id: "color-dodge", label: "Color Dodge" },
  { id: "color-burn", label: "Color Burn" },
  { id: "hard-light", label: "Hard Light" },
  { id: "soft-light", label: "Soft Light" },
  { id: "difference", label: "Difference" },
  { id: "exclusion", label: "Exclusion" },
  { id: "hue", label: "Hue" },
  { id: "saturation", label: "Saturation" },
  { id: "color", label: "Color" },
  { id: "luminosity", label: "Luminosity" },
  { id: "addition", label: "Addition" },
  { id: "subtract", label: "Subtract" },
  { id: "divide", label: "Divide" },
] as const;

export const LAYER_KINDS = [
  "normal",
  "background",
  "group",
  "reference",
  "tilemap",
] as const;

export const DEFAULT_NAMES = {
  normal: "Layer",
  background: "Background",
  group: "Group",
  reference: "Reference",
  tilemap: "Tilemap",
} as const;
