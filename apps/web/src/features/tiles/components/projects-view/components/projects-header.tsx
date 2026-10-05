import Image from "next/image";
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@pigxel/ui/components/input";
import { Heading } from "@pigxel/ui/components/typography";
import mascot from "../../../../../../public/art/pigxel-mascot-studying.png";
import { FILTERS, type Filter } from "../constants";

export function ProjectsHeader({
  filter,
  onFilterChange,
  query,
  onQueryChange,
}: {
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
  query: string;
  onQueryChange: (query: string) => void;
}) {
  return (
    <header className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <Heading as="h1" className="text-[2.5rem] leading-[1.1] font-semibold">
          My projects
        </Heading>
        <p className="text-xs text-muted-foreground">
          Manage, organize and keep creating ✨
        </p>
        <div
          role="group"
          aria-label="Show"
          className="mt-6 flex min-h-10 flex-wrap items-center gap-3"
        >
          {FILTERS.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={filter === name}
              onClick={() => onFilterChange(name)}
              className="h-9 rounded-lg border bg-background px-5 text-xs transition-colors hover:bg-muted aria-pressed:border-transparent aria-pressed:bg-pastel-pink"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex w-full max-w-[364px] flex-col items-end">
        <Image
          src={mascot}
          alt=""
          width={237}
          height={158}
          priority
          className="-mt-[30px] -mb-[16px] hidden h-auto w-[237px] md:block"
        />
        <InputGroup>
          <InputGroupText className="pr-0">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="size-4"
            >
              <circle cx="9" cy="9" r="5.5" />
              <path d="m13 13 3.5 3.5" />
            </svg>
          </InputGroupText>
          <InputGroupInput
            type="search"
            aria-label="Search"
            placeholder="Search projects, templates, assets…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </InputGroup>
      </div>
    </header>
  );
}
