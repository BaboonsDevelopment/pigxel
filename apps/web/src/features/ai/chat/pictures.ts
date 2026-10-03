const CACHE = "pigxel-ai-pictures";

const keyOf = (id: string) => `/ai-pictures/${id}`;

const available = () => typeof caches !== "undefined";

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
