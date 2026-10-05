import { PixelImage } from "@/components/ui/pixel-image";
import type { Folder } from "../constants";
import { editedAgo } from "../helpers";

const PEEK = ["-rotate-6", "rotate-0", "rotate-6"];

export function FolderCard({ folder }: { folder: Folder }) {
  const shown = folder.projects.slice(0, 3);
  return (
    <li className="group relative">
      <div className="relative pt-[37px]">
        <div className="absolute inset-x-6 top-0 flex justify-center">
          {shown.map((project, i) => (
            <span
              key={project.id}
              className={`-mx-1 block h-[46px] w-[50px] overflow-hidden rounded-md border border-white bg-checker shadow-sm transition-transform group-hover:-translate-y-1 ${PEEK[i]}`}
            >
              {project.thumbnail && (
                <PixelImage
                  src={project.thumbnail}
                  alt=""
                  className="size-full object-cover"
                />
              )}
            </span>
          ))}
        </div>
        <div className="absolute inset-x-1 top-[27px] h-8 rounded-xl border border-[#f0c2d3] bg-[#fde3ec]" />
        <div className="relative flex h-[65px] items-center justify-between gap-2 rounded-2xl border border-[#f0c2d3] bg-[#fbd9e5] px-4">
          <span className="truncate text-sm font-semibold">{folder.name}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {folder.count} projects
          </span>
        </div>
      </div>
      <div className="invisible absolute inset-x-0 top-full z-20 mt-1 rounded-2xl border border-[#f0c2d3] bg-background p-2 opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <ul>
          {shown.map((project) => (
            <li
              key={project.id}
              className="flex items-center gap-2.5 border-b border-pastel-pink px-1 py-1.5 last:border-0"
            >
              <span className="block size-9 shrink-0 overflow-hidden rounded-md border bg-checker">
                {project.thumbnail && (
                  <PixelImage
                    src={project.thumbnail}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {project.name}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  Updated {editedAgo(project.at)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-1 flex items-center gap-2 border-t border-pastel-pink px-1 pt-2 text-xs">
          View all {folder.count} projects
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <path d="M2 8h12M10 4l4 4-4 4" />
          </svg>
        </div>
      </div>
    </li>
  );
}
