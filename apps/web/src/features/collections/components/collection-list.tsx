import Link from "next/link";
import { Heading } from "@pigxel/ui/components/typography";
import { PixelImage } from "@/components/ui/pixel-image";
import type { CollectionCard } from "../collections";
import { COLLECTION_COVERS } from "../constants";

export function CollectionList({
  collections,
}: {
  collections: CollectionCard[];
}) {
  return (
    <section className="mt-12">
      <Heading>Collections</Heading>
      <ul className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {collections.map((collection) => (
          <li key={collection.id}>
            <Link
              href={`/collections/${collection.id}`}
              className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <span className="grid aspect-square grid-cols-2 gap-0.5 overflow-hidden rounded-xl border bg-white/70 shadow-[0_1px_2px_rgb(59_42_51/0.06)] transition-shadow group-hover:shadow-md">
                {Array.from({ length: COLLECTION_COVERS }, (_, i) => (
                  <span key={i} className="block overflow-hidden bg-checker">
                    {collection.covers[i] && (
                      <PixelImage
                        src={collection.covers[i]}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    )}
                  </span>
                ))}
              </span>
              <span className="mt-2 block truncate text-sm font-semibold group-hover:text-primary">
                {collection.name}
              </span>
              <span className="block text-xs text-muted-foreground">
                {collection.count === 1 ? "1 art" : `${collection.count} arts`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
