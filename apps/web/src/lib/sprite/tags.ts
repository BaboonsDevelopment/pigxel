export type TagDirection = "forward" | "reverse" | "pingpong";

export type FrameTag = {
  id: string;
  name: string;
  from: number;
  to: number;
  color: string;
  direction: TagDirection;
  repeat: number;
};

const directions: TagDirection[] = ["forward", "reverse", "pingpong"];

export function readFrameTags(value: unknown, frameCount: number): FrameTag[] {
  if (!Array.isArray(value)) return [];
  const names = new Set<string>();
  return value.flatMap((entry): FrameTag[] => {
    if (!entry || typeof entry !== "object") return [];
    const tag = entry as Record<string, unknown>;
    const name =
      typeof tag.name === "string" ? tag.name.trim().slice(0, 100) : "";
    const key = name.toLowerCase();
    if (
      !name ||
      names.has(key) ||
      typeof tag.from !== "number" ||
      typeof tag.to !== "number" ||
      !Number.isInteger(tag.from) ||
      !Number.isInteger(tag.to)
    )
      return [];
    const from = tag.from as number;
    const to = tag.to as number;
    if (from < 0 || to < from || to >= frameCount) return [];
    names.add(key);
    return [
      {
        id: typeof tag.id === "string" && tag.id ? tag.id : crypto.randomUUID(),
        name,
        from,
        to,
        color:
          typeof tag.color === "string" && /^#[0-9a-fA-F]{6}$/.test(tag.color)
            ? tag.color
            : "#3b82f6",
        direction:
          directions.find((direction) => direction === tag.direction) ??
          "forward",
        repeat:
          typeof tag.repeat === "number" &&
          Number.isInteger(tag.repeat) &&
          tag.repeat >= 0 &&
          tag.repeat <= 1000
            ? tag.repeat
            : 0,
      },
    ];
  });
}

export function insertAt(tags: FrameTag[], index: number): FrameTag[] {
  return tags.map((tag) => ({
    ...tag,
    from: tag.from >= index ? tag.from + 1 : tag.from,
    to: tag.to >= index ? tag.to + 1 : tag.to,
  }));
}

export function removeAt(tags: FrameTag[], index: number): FrameTag[] {
  return tags.flatMap((tag) => {
    if (tag.from === index && tag.to === index) return [];
    return [
      {
        ...tag,
        from: tag.from > index ? tag.from - 1 : tag.from,
        to: tag.to >= index ? tag.to - 1 : tag.to,
      },
    ];
  });
}

export function tagSequence(tag: FrameTag): number[] {
  const forward = Array.from(
    { length: tag.to - tag.from + 1 },
    (_, index) => tag.from + index,
  );
  if (tag.direction === "reverse") return forward.reverse();
  if (tag.direction === "pingpong")
    return [...forward, ...forward.slice(1, -1).reverse()];
  return forward;
}
