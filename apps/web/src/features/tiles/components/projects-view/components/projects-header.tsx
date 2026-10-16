import Image from "next/image";
import { cn } from "@pigxel/ui/lib/utils";
import { madimiOne } from "@/lib/fonts/madimi";
import mascot from "../../../../../../public/art/pigxel-mascot-studying.png";
import {
  FILTERS,
  PROJECT_SORTS,
  type Filter,
  type ProjectFilters,
  type ProjectSort,
} from "../constants";
import { ProjectFiltersMenu } from "./project-filters-menu";
import { CATEGORY_ICONS, SortIcon } from "./toolbar-icons";
import { ToolbarMenu } from "./toolbar-menu";
import type { Label } from "../../../labels";

const CATEGORIES = FILTERS.map((name) => ({
  value: name,
  label: name,
  icon: CATEGORY_ICONS[name],
}));

export function ProjectsHeader({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  projectFilters,
  onProjectFiltersChange,
  labels,
  sort,
  onSortChange,
}: {
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
  query: string;
  onQueryChange: (query: string) => void;
  projectFilters: ProjectFilters;
  onProjectFiltersChange: (filters: ProjectFilters) => void;
  labels: Label[];
  sort: ProjectSort;
  onSortChange: (sort: ProjectSort) => void;
}) {
  return (
    <header className="relative mb-8 border-b border-[#f0dde5] pb-4 md:pt-4 lg:[zoom:clamp(0.7,tan(atan2(100vw,1920px)),1)]">
      <h1
        className={cn(
          madimiOne.className,
          "text-[48px] leading-[63px] tracking-[0.03em] text-[#4a2434]",
        )}
      >
        My projects
      </h1>
      <div className="mt-2.5 flex items-center gap-[23px] max-lg:flex-wrap lg:pr-[310px]">
        <label className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-[#e7c6d2] bg-background px-3 text-[#4a1f35] transition-colors focus-within:border-[#8c3a57] sm:w-[426px] sm:shrink">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="size-4 shrink-0 text-muted-foreground"
          >
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13 13 3.5 3.5" />
          </svg>
          <span className="sr-only">Search</span>
          <input
            type="search"
            placeholder="Search your projects…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </label>
        <ToolbarMenu
          label="Category"
          title="Category"
          icon={CATEGORY_ICONS[filter]}
          options={CATEGORIES}
          value={filter}
          onChange={onFilterChange}
        />
        {(filter === "All" || filter === "Projects") && (
          <>
            <ToolbarMenu
              label="Sort"
              icon={<SortIcon />}
              options={PROJECT_SORTS}
              value={sort}
              onChange={onSortChange}
            />
            <ProjectFiltersMenu
              filters={projectFilters}
              onChange={onProjectFiltersChange}
              labels={labels}
            />
          </>
        )}
      </div>
      <Image
        src={mascot}
        alt=""
        width={237}
        height={158}
        priority
        className="pointer-events-none absolute right-12 bottom-0 hidden h-auto w-[250px] translate-y-[9%] lg:block"
      />
    </header>
  );
}
