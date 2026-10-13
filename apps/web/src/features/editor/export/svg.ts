const hex = (v: number) => v.toString(16).padStart(2, "0");

export function encodeSvg(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  scale: number,
): string {
  const runs = new Map<string, string[]>();
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const i = (y * w + x) * 4;
      const a = rgba[i + 3]!;
      if (!a) {
        x++;
        continue;
      }
      const key = `#${hex(rgba[i]!)}${hex(rgba[i + 1]!)}${hex(rgba[i + 2]!)}|${a}`;
      let end = x + 1;
      while (end < w) {
        const j = (y * w + end) * 4;
        if (
          rgba[j] !== rgba[i] ||
          rgba[j + 1] !== rgba[i + 1] ||
          rgba[j + 2] !== rgba[i + 2] ||
          rgba[j + 3] !== a
        )
          break;
        end++;
      }
      const list = runs.get(key) ?? [];
      list.push(`M${x} ${y}h${end - x}v1h${x - end}z`);
      runs.set(key, list);
      x = end;
    }
  }
  const paths = [...runs].map(([key, parts]) => {
    const [fill, alpha] = key.split("|");
    const opacity =
      Number(alpha) < 255
        ? ` fill-opacity="${Math.round((Number(alpha) / 255) * 1000) / 1000}"`
        : "";
    return `<path fill="${fill}"${opacity} d="${parts.join("")}"/>`;
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">`,
    ...paths,
    "</svg>",
    "",
  ].join("\n");
}
