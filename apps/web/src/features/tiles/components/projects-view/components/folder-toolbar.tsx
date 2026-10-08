"use client";

import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@pigxel/ui/components/input";
import { OptionMenu } from "@/features/explore/components/explore-header/components/option-menu";
import type { Label } from "../../../labels";
import {
  PROJECT_SORTS,
  type ProjectFilters,
  type ProjectSort,
} from "../constants";
import { ProjectFiltersMenu } from "./project-filters-menu";
import { SortIcon } from "./toolbar-icons";

export function FolderToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  labels,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  sort: ProjectSort;
  onSortChange: (sort: ProjectSort) => void;
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
  labels: Label[];
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <InputGroup className="w-full max-w-[364px]">
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
          aria-label="Search this folder"
          placeholder="Search this folder…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </InputGroup>
      <OptionMenu
        label="Sort"
        icon={<SortIcon />}
        options={PROJECT_SORTS}
        value={sort}
        onChange={onSortChange}
      />
      <ProjectFiltersMenu
        filters={filters}
        onChange={onFiltersChange}
        labels={labels}
        storage={false}
      />
    </div>
  );
}
