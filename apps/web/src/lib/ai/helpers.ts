import { IMAGE_STYLE_RULES } from "./constants";

/** Wraps a subject description in the pixel-art style rules. */
export function buildImagePrompt(subject: string): string {
  return [subject, ...IMAGE_STYLE_RULES].join(" ");
}
