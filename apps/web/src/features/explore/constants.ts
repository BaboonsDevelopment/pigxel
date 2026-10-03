export const PERIODS = [
  { value: "week", label: "This week", days: 7 },
  { value: "month", label: "Month", days: 30 },
  { value: "year", label: "Year", days: 365 },
] as const;

export type Period = (typeof PERIODS)[number]["value"];

export const PAGE_SIZE = 20;
