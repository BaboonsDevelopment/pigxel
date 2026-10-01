/** The spans of time popular arts can be drawn from. */
export const PERIODS = [
  { value: "week", label: "This week", days: 7 },
  { value: "month", label: "Month", days: 30 },
  { value: "year", label: "Year", days: 365 },
] as const;

export type Period = (typeof PERIODS)[number]["value"];

/** Arts loaded at a time: four whole rows of 5. */
export const PAGE_SIZE = 20;
