export type Frame = { id: string; duration: number };

export type Cels = Map<string, Map<string, Uint8ClampedArray>>;

export type History<T> = { past: T[]; present: T; future: T[] };
