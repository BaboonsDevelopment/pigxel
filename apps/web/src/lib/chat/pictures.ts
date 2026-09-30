/**
 * Pictures from the AI kept in the browser's cache (Cache Storage), by id:
 * the chat's pictures and those layers were made from. Only their ids go to
 * Pigxel cloud with the chat, so on another device or after the cache is
 * cleared a picture is simply gone. Browser only; every call fails softly.
 */

const CACHE = "pigxel-ai-pictures";

/** Cache keys must be URLs; these are never fetched. */
const keyOf = (id: string) => `/ai-pictures/${id}`;

const available = () => typeof caches !== "undefined";

/** Keeps a picture (a data URL) and returns its id; null when it can't. */
export async function keepPicture(dataUrl: string): Promise<string | null> {
  if (!available()) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const id = crypto.randomUUID();
    const cache = await caches.open(CACHE);
    await cache.put(
      keyOf(id),
      new Response(blob, { headers: { "content-type": blob.type } }),
    );
    return id;
  } catch {
    return null;
  }
}

/** A kept picture as a data URL; null when it isn't in this browser. */
export async function findPicture(id: string): Promise<string | null> {
  if (!available()) return null;
  try {
    const cache = await caches.open(CACHE);
    const found = await cache.match(keyOf(id));
    if (!found) return null;
    const blob = await found.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
