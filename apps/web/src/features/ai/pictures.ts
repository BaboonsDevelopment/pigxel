/*
 * Images travel to the AI actions each in its own object. React caps the
 * text inside any one array of action arguments (the arguments themselves
 * included) at 1,000,000 characters, which two or three pictures pass; an
 * object starts a fresh count, so wrapped pictures only count as one each.
 * The 12mb body limit in next.config.ts still bounds the whole request.
 */

/** A picture as a data URL, wrapped for sending to an action. */
export type Picture = { dataUrl: string };

export const toPicture = (dataUrl: string): Picture => ({ dataUrl });

export const toPictures = (dataUrls: readonly string[] = []): Picture[] =>
  dataUrls.map(toPicture);

/** The data URL of a picture sent to an action; empty when it isn't one. */
export const fromPicture = (value: unknown): string =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Picture).dataUrl === "string"
    ? (value as Picture).dataUrl
    : "";

/** The data URLs of pictures sent to an action; null when any isn't one. */
export function fromPictures(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const urls = value.map(fromPicture);
  return urls.every(Boolean) ? urls : null;
}
