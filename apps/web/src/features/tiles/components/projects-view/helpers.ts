import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { listDrafts, type Draft } from "@/lib/pigxel-file/draft";
import { parsePigxel, type PigxelDocument } from "@/lib/pigxel-file/format";
import { SIZES } from "@/features/explore/constants";
import type { ProjectFilters } from "./constants";

export type Project =
  | {
      kind: "local";
      id: string;
      name: string;
      at: number;
      width: number;
      height: number;
      draft: Draft;
      image: PigxelDocument;
    }
  | {
      kind: "cloud";
      id: string;
      name: string;
      at: number;
      width: number;
      height: number;
      tile: CloudTileSummary;
    };

export function readLocalProjects(userId: string): Project[] {
  return listDrafts(userId).flatMap((draft): Project[] => {
    if (draft.location?.kind === "cloud") return [];
    try {
      const image = parsePigxel(draft.file);
      return [
        {
          kind: "local",
          id: draft.id,
          name: draft.name,
          at: draft.savedAt,
          width: image.width,
          height: image.height,
          draft,
          image,
        },
      ];
    } catch {
      return [];
    }
  });
}

export function matchesLocal(project: Project, filters: ProjectFilters) {
  if (project.kind !== "local") return true;
  if (filters.label) return false;
  const range = SIZES.find((s) => s.value === filters.size) ?? SIZES[0];
  if (range.max && (project.width > range.max || project.height > range.max))
    return false;
  if (range.min && project.width < range.min && project.height < range.min)
    return false;
  if (filters.animated && project.image.frames.length < 2) return false;
  const storage =
    project.draft.location?.kind === "drive" ? "drive" : "browser";
  return filters.storage === "any" || filters.storage === storage;
}

export function toCloudProject(tile: CloudTileSummary): Project {
  return {
    kind: "cloud",
    id: tile.id,
    name: tile.name,
    at: Date.parse(tile.updatedAt),
    width: tile.width,
    height: tile.height,
    tile,
  };
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

export function editedAgo(then: number, now = Date.now()) {
  const elapsed = now - then;
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of UNITS)
    if (elapsed >= size)
      return format.format(-Math.floor(elapsed / size), unit);
  return "just now";
}
