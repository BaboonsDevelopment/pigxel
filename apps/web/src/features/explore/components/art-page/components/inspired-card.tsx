import { Heading } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { pixelifySans } from "@/lib/fonts/pixelify";

export function InspiredCard() {
  return (
    <section
      aria-labelledby="inspired-heading"
      className="rounded-2xl border border-[#f6d3df] bg-[#fdebf1] p-5"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        className="size-5 text-primary"
      >
        <path d="M8 2.5 9.3 6.7 13.5 8 9.3 9.3 8 13.5 6.7 9.3 2.5 8l4.2-1.3Z" />
        <path d="m15 11.5.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" />
        <path d="m14.5 2.5.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5Z" />
      </svg>
      <Heading
        as="h2"
        id="inspired-heading"
        className="mt-2 text-lg font-semibold"
      >
        Inspired? Add your own magic.
      </Heading>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        Try a new season, change the sky, or plant a tiny garden. When you share
        your remix, keep a little credit for the original creator.
      </p>
      <p
        className={cn(
          pixelifySans.className,
          "mt-3 text-[10px] tracking-widest text-primary uppercase",
        )}
      >
        Create · Credit · Connect
      </p>
    </section>
  );
}
