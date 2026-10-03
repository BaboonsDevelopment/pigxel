import Image from "next/image";
import { Badge } from "@pigxel/ui/components/badge";
import { videoEmbedUrl, type Tutorial } from "@/lib/tutorials/tutorials";

export function TutorialVideo({ tutorial }: { tutorial: Tutorial }) {
  if (tutorial.youtubeId)
    return (
      <iframe
        src={videoEmbedUrl(tutorial.youtubeId)}
        title={`${tutorial.title} video`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="aspect-video w-full rounded-2xl border bg-black"
      />
    );
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border bg-pastel-pink">
      <Image
        src={tutorial.image}
        alt=""
        sizes="(min-width: 1024px) 760px, 100vw"
        className="size-full object-cover opacity-60 blur-[1px]"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md"
        >
          <svg viewBox="0 0 16 16" className="ml-1 size-5">
            <path d="M4 2.5v11L13 8z" fill="currentColor" />
          </svg>
        </span>
        <Badge tone="overlay" className="px-3 py-1 text-xs">
          Video coming soon: try the interactive guide
        </Badge>
      </div>
    </div>
  );
}
