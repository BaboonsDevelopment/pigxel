import Link from "next/link";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";
import { pixelifySans } from "@/lib/fonts/pixelify";
import type { Folder, FolderProject } from "../../../folders";
import { editedAgo } from "../helpers";

const DECK = [
  "z-10 -rotate-6 group-hover:-translate-x-4 group-hover:-translate-y-1 group-hover:-rotate-12",
  "z-20 -ml-5 -rotate-1 group-hover:-translate-y-3 group-hover:rotate-0",
  "z-10 -ml-5 rotate-6 group-hover:translate-x-4 group-hover:-translate-y-1 group-hover:rotate-12",
];

export function FolderCard({
  folder,
  opening,
  onOpen,
}: {
  folder: Folder;
  opening: string | null;
  onOpen: (project: FolderProject) => void;
}) {
  const href = `/tiles?folder=${folder.id}`;
  const shown = folder.projects.slice(0, 3);
  return (
    <li className="group relative">
      <Link
        href={href}
        className="relative block rounded-2xl pt-12 outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <span className="absolute inset-x-0 top-8 h-12 rounded-2xl border border-[#efc0d0] bg-[#fef1f5]" />
        <span className="absolute top-5 left-0 h-14 w-2/5 rounded-2xl border border-[#efc0d0] bg-[#fde6ee]" />
        <span className="absolute inset-x-0 top-0 flex justify-center">
          {shown.map((project, i) => (
            <span
              key={project.id}
              className={cn(
                "block h-[72px] w-[84px] origin-bottom overflow-hidden rounded-xl border-2 border-white bg-checker shadow-md transition-transform duration-300 ease-out motion-reduce:transition-none",
                DECK[i],
              )}
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
        </span>
        <span className="relative z-30 flex h-[68px] items-center justify-between gap-2 rounded-2xl border border-[#efc0d0] bg-[#fadbe5] px-4 transition-colors group-hover:bg-[#f8d2df]">
          <span className="truncate text-base font-semibold">
            {folder.name}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {folder.count} {folder.count === 1 ? "project" : "projects"}
          </span>
        </span>
      </Link>
      {shown.length > 0 && (
        <div className="invisible absolute inset-x-0 top-full z-40 pt-1 opacity-0 transition-opacity duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
          <div className="overflow-hidden rounded-2xl border border-[#efc0d0] bg-background shadow-lg">
            <ul className="px-2 pt-1.5">
              {shown.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    aria-label={`Open ${project.name}`}
                    disabled={opening !== null}
                    onClick={() => onOpen(project)}
                    className="group/row flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors outline-none hover:bg-pastel-pink-soft focus-visible:bg-pastel-pink-soft disabled:cursor-default"
                  >
                    <span className="relative block size-10 shrink-0 overflow-hidden rounded-lg border bg-checker">
                      {project.thumbnail && (
                        <PixelImage
                          src={project.thumbnail}
                          alt=""
                          className="size-full object-cover"
                        />
                      )}
                      <span className="absolute inset-0 bg-[#4a1f35]/25 bg-[linear-gradient(rgb(255_255_255/0.45)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.45)_1px,transparent_1px)] bg-[size:8px_8px] opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-visible/row:opacity-100" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {project.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        Updated {editedAgo(project.at)}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        pixelifySans.className,
                        "shrink-0 rounded-[7px] border-[1.5px] border-[#fde7ef] bg-[#fffcfd] px-2 py-1 text-[11px] leading-[13px] whitespace-nowrap opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-visible/row:opacity-100",
                        opening === project.id && "opacity-100",
                      )}
                    >
                      {opening === project.id ? "Opening…" : "Open →"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Link
              href={href}
              className="mt-1 flex items-center gap-2 border-t border-[#f6dbe4] px-4 py-2.5 text-xs transition-colors hover:bg-pastel-pink-soft"
            >
              View all {folder.count} projects
              <svg
                aria-hidden="true"
                viewBox="0 0 20 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-5"
              >
                <path d="M1 6h17M13.5 1.5 18 6l-4.5 4.5" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}
