import Link from "next/link";
import type { ArtistProfile } from "../profile";
import { PROFILE_GRID } from "./profile-hero/constants";
import { ProfileAvatar } from "./profile-avatar";

export function PeopleGrid({ people }: { people: ArtistProfile[] }) {
  return (
    <ul className={PROFILE_GRID}>
      {people.map((person) => (
        <li key={person.id}>
          <Link
            href={`/u/${person.username}`}
            className="flex flex-col items-center rounded-xl border bg-card px-3 py-5 text-center shadow-[0_1px_2px_rgb(59_42_51/0.06)] transition-shadow hover:shadow-md"
          >
            <ProfileAvatar
              name={person.name}
              url={person.avatarUrl}
              className="size-16 text-xl"
            />
            <span className="mt-3 w-full truncate text-sm font-semibold">
              {person.name}
            </span>
            <span className="w-full truncate text-[11px] text-muted-foreground">
              @{person.username}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
