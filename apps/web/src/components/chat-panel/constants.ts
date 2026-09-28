export const SUGGESTIONS = [
  "make the eyes red",
  "draw a small green slime",
  "add a one-pixel outline",
];

/** Where a new picture goes: the whole tile, or an area the user selects. */
export type CreateTarget = "tile" | "area";

export const CREATE_TARGETS: { target: CreateTarget; label: string }[] = [
  { target: "tile", label: "Whole tile" },
  { target: "area", label: "Select an area" },
];
