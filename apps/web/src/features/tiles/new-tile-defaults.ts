import { MAX_PIGXEL_SIZE, type Background } from "@/lib/pigxel-file/format";

export type NewTileStorage = "cloud" | "drive" | "none";

export type NewTileDefaults = {
  width: number;
  height: number;
  background: Background;
  storage: NewTileStorage;
};

const FALLBACK: NewTileDefaults = {
  width: 32,
  height: 32,
  background: "transparent",
  storage: "cloud",
};

const keyOf = (userId: string) => `pigxel:new-tile:${userId}`;

const sizeOf = (value: unknown, fallback: number) =>
  Number.isInteger(value) &&
  (value as number) >= 1 &&
  (value as number) <= MAX_PIGXEL_SIZE
    ? (value as number)
    : fallback;

export function readNewTileDefaults(userId: string): NewTileDefaults {
  try {
    const raw = JSON.parse(
      window.localStorage.getItem(keyOf(userId)) ?? "null",
    ) as Partial<Record<keyof NewTileDefaults, unknown>> | null;
    if (!raw || typeof raw !== "object") return FALLBACK;
    return {
      width: sizeOf(raw.width, FALLBACK.width),
      height: sizeOf(raw.height, FALLBACK.height),
      background: ["transparent", "white", "black"].includes(
        raw.background as string,
      )
        ? (raw.background as Background)
        : FALLBACK.background,
      storage: ["cloud", "drive", "none"].includes(raw.storage as string)
        ? (raw.storage as NewTileStorage)
        : FALLBACK.storage,
    };
  } catch {
    return FALLBACK;
  }
}

export function writeNewTileDefaults(userId: string, value: NewTileDefaults) {
  try {
    window.localStorage.setItem(keyOf(userId), JSON.stringify(value));
  } catch {}
}
