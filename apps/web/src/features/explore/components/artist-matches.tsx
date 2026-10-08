import Link from "next/link";
import type { ArtistResult } from "@/features/search/server";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { Highlighted } from "./popular-card/components/highlighted";

export function ArtistMatches({
  artists,
  words,
}: {
  artists: ArtistResult[];
  words: string[];
}) {
  return (
    <section aria-label="Artists" className="animate-in fade-in">
      <h2 className="mb-2 text-xs font-medium text-muted-foreground">
        Artists
      </h2>
      <ul className="flex flex-wrap gap-2">
        {artists.map((artist) => (
          <li key={artist.id}>
            <Link
              href={`/u/${artist.username}`}
              className="flex h-10 items-center gap-2 rounded-full border bg-background py-1 pr-4 pl-1 text-xs transition-[background-color,transform] duration-200 hover:bg-muted active:scale-95 motion-reduce:transition-none"
            >
              <ProfileAvatar
                name={artist.name}
                url={artist.avatarUrl}
                className="size-8 text-xs"
              />
              <span className="flex flex-col leading-tight">
                <span className="font-medium">
                  <Highlighted text={artist.name} words={words} />
                </span>
                <span className="text-muted-foreground">
                  @<Highlighted text={artist.username} words={words} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
