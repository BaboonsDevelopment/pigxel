/** Layer opacity runs from fully transparent (0) to fully opaque (255), as in Aseprite. */
export const MAX_OPACITY = 255;

/** How a layer's colours mix with what is below it, in Aseprite's order. */
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
] as const;

/** The base of the names new layers get, numbered: "Layer 2", "Group 1". */
export const DEFAULT_NAMES = {
  normal: "Layer",
  background: "Background",
  group: "Group",
  reference: "Reference",
} as const;
