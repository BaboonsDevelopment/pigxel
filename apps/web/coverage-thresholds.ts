/**
 * Floors just under today's coverage, so it can only go up. Raise them as
 * tests are added. Vitest enforces them; the internal tests page shows them.
 */
export const COVERAGE_THRESHOLDS = {
  lines: 31,
  statements: 31,
  functions: 23,
  branches: 25,
};
