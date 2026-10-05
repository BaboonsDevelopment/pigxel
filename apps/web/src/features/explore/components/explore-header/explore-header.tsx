"use client";

import Image from "next/image";
import Link from "next/link";
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@pigxel/ui/components/input";
import { Heading } from "@pigxel/ui/components/typography";
import { CATEGORIES, PERIODS, type Period, type Sort } from "../../constants";
import mascot from "../../../../../public/art/pigxel-maskot-searching.png";
import { PublishButton } from "./components/publish-button";
import { SortMenu } from "./components/sort-menu";

export function ExploreHeader({
  period,
  tag,
  sort,
  onSortChange,
  query,
  onQueryChange,
  guest,
}: {
  period: Period;
  tag: string | null;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
  query: string;
  onQueryChange: (query: string) => void;
  guest: boolean;
}) {
  const hrefFor = (name: string) => {
    const params = new URLSearchParams();
    if (period !== PERIODS[0].value) params.set("period", period);
    if (name !== CATEGORIES[0]) params.set("tag", name);
    const query = params.toString();
    return query ? `/explore?${query}` : "/explore";
  };
  return (
    <header className="mb-12">
      <div className="flex items-center gap-1">
        <Heading
          as="h1"
          id="popular-heading"
          className="text-[2.5rem] font-semibold"
        >
          Explore
        </Heading>
        <Image
          src={mascot}
          alt=""
          width={140}
          height={116}
          priority
          className="-mt-6 -mb-11 h-auto w-[140px] shrink-0"
        />
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <InputGroup className="max-w-xs">
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
        <PublishButton guest={guest} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3">
        <div
          role="group"
          aria-label="Category"
          className="flex flex-wrap gap-3"
        >
          {CATEGORIES.map((name) => (
            <Link
              key={name}
              href={hrefFor(name)}
              scroll={false}
              aria-current={
                (tag ?? CATEGORIES[0]) === name ? "page" : undefined
              }
              className="flex h-9 items-center rounded-lg border bg-background px-5 text-xs transition-colors hover:bg-muted aria-[current]:border-transparent aria-[current]:bg-pastel-pink"
            >
              {name}
            </Link>
          ))}
        </div>
        <div>
          <SortMenu sort={sort} onChange={onSortChange} />
        </div>
      </div>
    </header>
  );
}
