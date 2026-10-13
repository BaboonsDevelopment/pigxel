import { saveCloudTile } from "@/lib/pigxel-file/cloud";
import { parsePigxel } from "@/lib/pigxel-file/format";
import { draftFromFile } from "@/lib/pigxel-file/open-tile";
import { thumbnailDataUrl } from "@/lib/pigxel-file/thumbnail";
import { linkRemix } from "./actions";

export async function remixArt(
  userId: string,
  art: { id: string; name: string },
  file: string,
): Promise<string> {
  const image = parsePigxel(file);
  const name = `${art.name.slice(0, 91)} (remix)`;
  const copy = await saveCloudTile(
    { name },
    file,
    image,
    thumbnailDataUrl(image),
  );
  await linkRemix(copy.id, art.id);
  return draftFromFile(userId, file, name, { kind: "cloud", tile: copy });
}
