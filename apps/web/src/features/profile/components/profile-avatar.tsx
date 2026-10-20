import { cn } from "@pigxel/ui/lib/utils";

/** Background and pixel colors for generated avatars, from the brand pastels. */
const PALETTES = [
  ["#f8dde6", "#b0446c"],
  ["#e9c2d2", "#6e2848"],
  ["#d9ecdf", "#2f7a52"],
  ["#dde6f8", "#3d5aa8"],
  ["#f8ecd6", "#a8642a"],
  ["#eadcf5", "#6c3fa0"],
] as const;

const SIZE = 5;

/** FNV-1a: the same name always draws the same avatar, on server and client. */
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A mirrored 5×5 pixel sprite, like a tiny space invader. */
function pixelAvatar(name: string) {
  const h = hash(name.trim().toLowerCase() || "?");
  // The low 15 bits draw the pixels; the high ones pick the colors.
  const [background, ink] = PALETTES[(h >>> 16) % PALETTES.length]!;
  const half = Math.ceil(SIZE / 2);
  let path = "";
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < half; x++) {
      if (!((h >>> (y * half + x)) & 1)) continue;
      path += `M${x + 1} ${y + 1}h1v1h-1Z`;
      if (x !== SIZE - 1 - x) path += `M${SIZE - x} ${y + 1}h1v1h-1Z`;
    }
  return { background, ink, path };
}

export function ProfileAvatar({
  name,
  url,
  className = "size-9 text-sm",
}: {
  name: string;
  url: string | null;
  className?: string;
}) {
  if (url)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from the sign-in provider or Storage
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  const { background, ink, path } = pixelAvatar(name);
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${SIZE + 2} ${SIZE + 2}`}
      shapeRendering="crispEdges"
      className={cn("shrink-0 rounded-full", className)}
    >
      <rect width={SIZE + 2} height={SIZE + 2} fill={background} />
      <path d={path} fill={ink} />
    </svg>
  );
}
