import { imageBackdrop } from "@/lib/ai/actions";
import { CHROMA_KEY_HEX } from "@/lib/image/constants";

/**
 * The background for a picture sent to the image model as a reference, to
 * match what it draws: transparent (null), or the magenta it keys out.
 */
export async function referenceBackground(): Promise<string | null> {
  const backdrop = await imageBackdrop().catch(() => "chroma" as const);
  return backdrop === "transparent" ? null : CHROMA_KEY_HEX;
}
