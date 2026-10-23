import { cn } from "@pigxel/ui/lib/utils";
import { NewProjectButton } from "@/features/home/components/new-project-button";
import { pixelifySans } from "@/lib/fonts/pixelify";

export function NewProjectCard({
  userId,
  folder,
}: {
  userId: string;
  folder?: { id: string; name: string };
}) {
  return (
    <li>
      <NewProjectButton
        userId={userId}
        folder={folder}
        className={cn(
          pixelifySans.className,
          "flex h-full min-h-40 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-[#eba9c0] bg-background text-sm text-primary transition-colors hover:border-primary hover:bg-pastel-pink-soft focus-visible:bg-pastel-pink-soft",
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
      </NewProjectButton>
    </li>
  );
}
