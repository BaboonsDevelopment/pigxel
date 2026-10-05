"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@pigxel/ui/components/input";
import { Heading } from "@pigxel/ui/components/typography";
import { CATEGORIES, type Sort } from "../../constants";
import mascot from "../../../../../public/art/pigxel-maskot-searching.png";
import { SortMenu } from "./components/sort-menu";

export function ExploreHeader({
  sort,
  onSortChange,
  query,
  onQueryChange,
}: {
  sort: Sort;
  onSortChange: (sort: Sort) => void;
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
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
        <Button type="button" className="h-10 px-5">
          Upload
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="size-4"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
        </Button>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3">
        <div
          role="group"
          aria-label="Category"
          className="flex flex-wrap gap-3"
        >
          {CATEGORIES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
              className="h-9 rounded-lg border bg-background px-5 text-xs transition-colors hover:bg-muted aria-pressed:border-transparent aria-pressed:bg-pastel-pink"
            >
              {name}
            </button>
          ))}
        </div>
        <div>
          <SortMenu sort={sort} onChange={onSortChange} />
        </div>
      </div>
    </header>
  );
}
