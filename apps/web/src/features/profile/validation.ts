export const NAME_MAX = 50;
export const BIO_MAX = 200;
export const MAX_LINKS = 3;
export const LINK_LABEL_MAX = 40;
const LINK_URL_MAX = 200;
const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

const RESERVED = new Set([
  "admin",
  "administrator",
  "api",
  "help",
  "me",
  "mod",
  "moderator",
  "official",
  "pigxel",
  "profile",
  "root",
  "settings",
  "staff",
  "support",
  "system",
  "team",
]);

export type ProfileLink = { label?: string; url: string };

export function normalizeUsername(raw: string) {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export function usernameError(username: string): string | null {
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX)
    return `Use ${USERNAME_MIN}–${USERNAME_MAX} characters.`;
  if (!/^[a-z0-9_]+$/.test(username))
    return "Use only letters, numbers and underscores.";
  if (RESERVED.has(username)) return "This username is reserved.";
  return null;
}

export function normalizeUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text || text.length > LINK_URL_MAX || /\s/.test(text)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text)
    ? text
    : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (!/^[^.]+(\.[^.]+)+$/.test(url.hostname)) return null;
  const out = url.toString();
  return out.length <= LINK_URL_MAX ? out : null;
}

const SITES: [RegExp, string][] = [
  [/(^|\.)pinterest\.[a-z.]+$|(^|\.)pin\.it$/, "Pinterest"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)artstation\.com$/, "ArtStation"],
  [/(^|\.)behance\.net$/, "Behance"],
  [/(^|\.)dribbble\.com$/, "Dribbble"],
  [/(^|\.)deviantart\.com$/, "DeviantArt"],
  [/(^|\.)(x|twitter)\.com$/, "X"],
  [/(^|\.)bsky\.app$/, "Bluesky"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)itch\.io$/, "itch.io"],
  [/(^|\.)github\.com$/, "GitHub"],
];

export function linkTitle(link: ProfileLink): string {
  if (link.label?.trim()) return link.label.trim();
  let host: string;
  try {
    host = new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    return link.url;
  }
  return SITES.find(([pattern]) => pattern.test(host))?.[1] ?? host;
}

export function parseLinks(
  urls: string[],
  labels: string[],
): { links: ProfileLink[] } | { error: string } {
  const links: ProfileLink[] = [];
  for (const [i, raw] of urls.entries()) {
    const label = (labels[i] ?? "").trim();
    if (!raw.trim()) {
      if (label) return { error: `Add the address for “${label}”.` };
      continue;
    }
    const url = normalizeUrl(raw);
    if (!url) return { error: `“${raw.trim()}” isn’t a valid web address.` };
    if (label.length > LINK_LABEL_MAX)
      return { error: `Keep link names to ${LINK_LABEL_MAX} characters.` };
    links.push(label ? { label, url } : { url });
  }
  if (links.length > MAX_LINKS)
    return { error: `Add up to ${MAX_LINKS} links.` };
  return { links };
}

export function readLinks(value: unknown): ProfileLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (link): link is ProfileLink =>
        typeof link === "object" &&
        link !== null &&
        typeof link.url === "string" &&
        link.url.startsWith("https://"),
    )
    .slice(0, MAX_LINKS)
    .map((link) =>
      typeof link.label === "string" && link.label
        ? { label: link.label, url: link.url }
        : { url: link.url },
    );
}

export function usernameIn(segment: string) {
  try {
    return normalizeUsername(decodeURIComponent(segment));
  } catch {
    return "";
  }
}
