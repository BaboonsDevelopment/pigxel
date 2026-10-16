import Link from "next/link";
import { cn } from "@pigxel/ui/lib/utils";
import { pixelifySans } from "@/lib/fonts/pixelify";

export function NewProjectCard({ folderId }: { folderId?: string }) {
  return (
    <li>
      <Link
        href={
          folderId
            ? `/tiles/new?folder=${encodeURIComponent(folderId)}`
            : "/tiles/new"
        }
        className={cn(
          pixelifySans.className,
          "flex h-full min-h-40 items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-[#eba9c0] bg-background text-sm text-primary transition-colors hover:border-primary hover:bg-pastel-pink-soft focus-visible:bg-pastel-pink-soft",
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
          <path
            d="M8 2v12M2 8h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        New project
      </Link>
    </li>
  );
}
