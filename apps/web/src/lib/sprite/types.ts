/** One picture of an animation, shown for `duration` milliseconds. */
export type Frame = { id: string; duration: number };

/**
 * The pixels of every cel: a cel is one layer in one frame. Keyed by frame id,
 * then layer id; a missing cel is empty (fully transparent). Groups have none.
 */
export type Cels = Map<string, Map<string, Uint8ClampedArray>>;

/** An editing history: the current state, and those undo and redo go to. */
export type History<T> = { past: T[]; present: T; future: T[] };
