import type { History } from "./types";

export function startHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

export function record<T>(
  history: History<T>,
  next: T,
  limit: number,
): History<T> {
  return {
    past: [...history.past, history.present].slice(-limit),
    present: next,
    future: [],
  };
}

export function undo<T>(history: History<T>): History<T> | null {
  const previous = history.past.at(-1);
  if (previous === undefined) return null;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo<T>(history: History<T>): History<T> | null {
  const [next, ...rest] = history.future;
  if (next === undefined) return null;
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
  };
}
