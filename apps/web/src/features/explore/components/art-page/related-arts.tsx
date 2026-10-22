import type { PublicTile } from "@/features/profile/profile";
import {
  listRemixes,
  listSameTagArts,
  listSimilarArts,
} from "@/features/profile/server";
import { canvasSizeOf } from "../../constants";
import { ArtStrip } from "./components/art-strip";

/**
 * The art page's Remixes, Tagged and Similar strips. Streamed in after the
 * page (see the Suspense around it), so they never hold it up; the three
 * load at once.
 */
export async function RelatedArts({
  tile,
  viewerId,
}: {
  tile: PublicTile;
  viewerId: string | null;
}) {
  const [remixes, sameTags, sized] = await Promise.all([
    listRemixes(tile.id).catch(() => []),
    listSameTagArts(tile, viewerId).catch(() => []),
    // A few extra, since those already shown for its tags are left out.
    listSimilarArts(tile, viewerId, [], 8).catch(() => []),
  ]);
  const tagged = new Set(sameTags.map((art) => art.id));
  const similar = sized.filter((art) => !tagged.has(art.id)).slice(0, 4);
  if (!remixes.length && !sameTags.length && !similar.length) return null;

  return (
    <div className="flex flex-col gap-8">
      {remixes.length > 0 && (
        <ArtStrip
          title={`Remixes (${tile.remixes ?? remixes.length})`}
          arts={remixes}
        />
      )}
      {sameTags.length > 0 && (
        <ArtStrip
          title={`Tagged ${tile.tags
            .slice(0, 3)
            .map((tag) => `#${tag.toLowerCase()}`)
            .join(" ")}`}
          arts={sameTags}
          viewAll={`/explore?tag=${encodeURIComponent(tile.tags.join(","))}`}
        />
      )}
      {similar.length > 0 && (
        <ArtStrip
          title="Similar artwork"
          arts={similar}
          viewAll={similarHref(tile)}
        />
      )}
    </div>
  );
}

/** Explore filtered to the art's canvas size, where "Similar artwork" comes from. */
function similarHref(tile: Pick<PublicTile, "width" | "height">) {
  const size = canvasSizeOf(tile.width, tile.height);
  return size ? `/explore?size=${size.value}` : "/explore";
}
