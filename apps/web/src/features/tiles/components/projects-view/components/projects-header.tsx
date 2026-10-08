import Image from "next/image";
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@pigxel/ui/components/input";
import { Heading } from "@pigxel/ui/components/typography";
import mascot from "../../../../../../public/art/pigxel-mascot-studying.png";
import {
  FILTERS,
  PROJECT_SORTS,
  type Filter,
  type ProjectFilters,
  type ProjectSort,
} from "../constants";
import { ProjectFiltersMenu } from "./project-filters-menu";
import { SortIcon } from "./toolbar-icons";
import { StatsHover } from "./stats-hover";
import { OptionMenu } from "@/features/explore/components/explore-header/components/option-menu";
import type { Label } from "../../../labels";

const SIDE_VIEWS: ReadonlySet<Filter> = new Set(["Archive", "Trash"]);

function ViewButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative flex">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border bg-background text-foreground transition-colors hover:bg-muted aria-pressed:border-transparent aria-pressed:bg-pastel-pink"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-[18px]"
        >
          {children}
        </svg>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-[10px] whitespace-nowrap text-background opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

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
          {FILTERS.filter((name) => !SIDE_VIEWS.has(name)).map((name) => (
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
          {(filter === "All" || filter === "Projects") && (
            <>
              <OptionMenu
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
      </div>
      <div className="flex w-full max-w-[460px] flex-col items-end">
        <Image
          src={mascot}
          alt=""
          width={237}
          height={158}
          priority
          className="-mt-[30px] -mb-[16px] hidden h-auto w-[237px] md:block"
        />
        <div className="flex w-full items-center gap-2">
          <StatsHover tile={null} />
          <ViewButton
            label="Archive"
            active={filter === "Archive"}
            onClick={() =>
              onFilterChange(filter === "Archive" ? "All" : "Archive")
            }
          >
            <rect x="2.5" y="3" width="15" height="4" rx="1" />
            <path d="M3.5 7v8.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V7M8 10.5h4" />
          </ViewButton>
          <ViewButton
            label="Trash"
            active={filter === "Trash"}
            onClick={() => onFilterChange(filter === "Trash" ? "All" : "Trash")}
          >
            <path d="M3 5.5h14M8 5.5V3.5h4v2M4.5 5.5l.8 11a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-11M8.5 9v5.5M11.5 9v5.5" />
          </ViewButton>
          <InputGroup className="flex-1">
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
      </div>
    </header>
  );
}
