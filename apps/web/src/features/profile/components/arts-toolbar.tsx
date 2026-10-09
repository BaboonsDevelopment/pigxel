"use client";

import { useRouter } from "next/navigation";
import { OptionMenu } from "@/features/explore/components/explore-header/components/option-menu";
import { SortIcon } from "@/features/tiles/components/projects-view/components/toolbar-icons";
import { ART_SORTS, type ArtSort, type ArtsQuery } from "../profile";

const ALL_TAGS = "";

export function ArtsToolbar({
  username,
  query,
  tags,
}: {
  username: string;
  query: ArtsQuery;
  tags: string[];
}) {
  const router = useRouter();

  const go = (next: ArtsQuery) => {
    const params = new URLSearchParams();
    if (next.sort !== "newest") params.set("sort", next.sort);
    if (next.tag) params.set("tag", next.tag);
    const search = params.toString();
    router.replace(`/u/${username}${search ? `?${search}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <OptionMenu
        label="Tag"
        options={[
          { value: ALL_TAGS, label: tags.length ? "All tags" : "No tags yet" },
          ...tags.map((tag) => ({ value: tag, label: `#${tag}` })),
        ]}
        value={query.tag ?? ALL_TAGS}
        onChange={(tag) => go({ ...query, tag: tag || null })}
      />
      <OptionMenu
        label="Sort"
        icon={<SortIcon />}
        options={ART_SORTS}
        value={query.sort}
        onChange={(sort: ArtSort) => go({ ...query, sort })}
      />
    </div>
  );
}
