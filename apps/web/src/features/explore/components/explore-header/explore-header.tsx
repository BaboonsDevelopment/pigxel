"use client";

import Image from "next/image";
import { cn } from "@pigxel/ui/lib/utils";
import { madimiOne } from "@/lib/fonts/madimi";
import { PERIODS, SORTS, type Period, type Sort } from "../../constants";
import mascot from "../../../../../public/art/pigxel-maskot-searching.png";
import { PublishButton } from "./components/publish-button";
import {
  FiltersPopover,
  type FilterValues,
} from "./components/filters-popover";
import {
  CalendarIcon,
  ClockIcon,
  HeartIcon,
  SortAzIcon,
  StarIcon,
} from "./components/icons";
import { GridSizeToggle, type GridSize } from "./components/grid-size-toggle";
import { MenuButton } from "./components/menu-button";
import { TagSearch } from "./components/tag-search";

const SORT_ICONS: Record<Sort, React.ReactNode> = {
  popular: <StarIcon />,
  recent: <ClockIcon />,
  mostLiked: <HeartIcon />,
  az: <SortAzIcon />,
};

export function ExploreHeader({
  period,
  onPeriodChange,
  sort,
  onSortChange,
  tags,
  tagCounts,
  onTagsChange,
  filters,
  onFiltersApply,
  query,
  onQueryChange,
  onQuerySubmit,
  searching,
  guest,
  gridSize,
  onGridSizeChange,
}: {
  period: Period;
  onPeriodChange: (period: Period) => void;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
  tags: string[];
  tagCounts: Record<string, number> | null;
  onTagsChange: (tags: string[]) => void;
  filters: FilterValues;
  onFiltersApply: (filters: FilterValues) => void;
  query: string;
  onQueryChange: (query: string) => void;
  onQuerySubmit: () => void;
  searching: boolean;
  guest: boolean;
  gridSize: GridSize;
  onGridSizeChange: (size: GridSize) => void;
}) {
  return (
    <header className="relative mb-10 md:pt-4 lg:[zoom:clamp(0.7,tan(atan2(100vw,1920px)),1)]">
      <h1
        id="popular-heading"
        className={cn(
          madimiOne.className,
          "text-[48px] leading-[63px] tracking-[0.03em] text-[#4a2434]",
        )}
      >
        Explore
      </h1>
      <Image
        src={mascot}
        alt=""
        width={101}
        height={86}
        priority
        className="pointer-events-none absolute top-[14px] left-[325px] hidden h-auto w-[101px] md:block"
      />
      <div className="mt-2.5 flex flex-wrap items-start justify-between gap-3">
        <TagSearch
          query={query}
          onQueryChange={onQueryChange}
          onQuerySubmit={onQuerySubmit}
          searching={searching}
          tags={tags}
          tagCounts={tagCounts}
          onTagsChange={onTagsChange}
        />
        <PublishButton guest={guest} />
      </div>
      <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
        <MenuButton
          label="Sort"
          icon={SORT_ICONS[sort]}
          options={SORTS.map((s) => ({ ...s, icon: SORT_ICONS[s.value] }))}
          value={sort}
          onChange={onSortChange}
        />
        {sort === "popular" && (
          <MenuButton
            label="Period"
            icon={<CalendarIcon />}
            options={PERIODS}
            value={period}
            onChange={onPeriodChange}
          />
        )}
        <FiltersPopover
          value={filters}
          guest={guest}
          onApply={onFiltersApply}
        />
        <GridSizeToggle
          value={gridSize}
          onChange={onGridSizeChange}
          className="ml-auto"
        />
      </div>
    </header>
  );
}
