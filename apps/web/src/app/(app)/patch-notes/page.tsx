import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@pigxel/ui/components/page";
import { PATCH_NOTES, patchDate } from "@/features/patch-notes/patch-notes";
import { VersionSelect } from "@/features/patch-notes/components/version-select";
import { ReleaseArt } from "@/features/patch-notes/components/release-art";
import { Eyebrow, Heading } from "@pigxel/ui/components/typography";

export const metadata: Metadata = { title: "Patch notes · Pigxel" };

type Props = { searchParams: Promise<{ v?: string }> };

const sectionLooks: Record<
  string,
  { color: string; symbol: string; caption: string }
> = {
  Drawing: { color: "bg-[#f9e9df]", symbol: "✎", caption: "Make your mark" },
  Selections: {
    color: "bg-[#eee8f5]",
    symbol: "⌖",
    caption: "Every pixel in its place",
  },
  Colours: { color: "bg-[#e8eee3]", symbol: "▦", caption: "Find your colours" },
  "Layers & animation": {
    color: "bg-[#f8e6ee]",
    symbol: "▱",
    caption: "Bring it to life",
  },
  Pigxel: {
    color: "bg-[#eee8f5]",
    symbol: "✦",
    caption: "A little world for your art",
  },
};

export default async function PatchNotes({ searchParams }: Props) {
  const { v } = await searchParams;
  const note = PATCH_NOTES.find((n) => n.version === v) ?? PATCH_NOTES[0]!;
  const latest = note === PATCH_NOTES[0];
  const changeCount = note.sections.reduce(
    (count, section) => count + section.changes.length,
    0,
  );

  return (
    <Page className="pb-16">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow className="mb-1 tracking-[0.22em] text-primary-soft-foreground">
            The Pigxel changelog
          </Eyebrow>
          <Heading size="page" className="text-3xl">
            Patch notes<span className="text-primary">.</span>
          </Heading>
        </div>
        <VersionSelect
          value={note.version}
          versions={PATCH_NOTES.map((n, i) => ({
            version: n.version,
            label: `v${n.version}${i === 0 ? " (latest)" : ""}`,
          }))}
        />
      </div>

      <article>
        <header className="relative isolate overflow-hidden rounded-2xl bg-[#382d49] text-[#fff5e9]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:24px_24px]"
          />
          <div className="grid items-center gap-2 px-6 pt-7 pb-4 sm:px-9 md:grid-cols-[1.15fr_1fr] md:py-10">
            <div>
              <div className="mb-7 flex flex-wrap items-center gap-3 font-mono text-[11px]">
                <span className="border border-[#e6abc2]/40 px-2 py-1 text-[#f6c4d6]">
                  RELEASE {note.version}
                </span>
                {latest && (
                  <span className="flex items-center gap-2 text-[#f6c4d6]">
                    <span className="size-1.5 bg-[#a9c5a2]" />
                    Latest release
                  </span>
                )}
              </div>
              <Heading as="h2" size="display" className="max-w-md text-inherit">
                {note.title}
                <span className="text-[#f39dad]">.</span>
              </Heading>
              <p className="mt-5 max-w-md text-sm leading-7 text-[#e1cedb]">
                {note.summary}
              </p>
              <p className="mt-7 font-mono text-[11px] text-[#e1cedb]">
                <time dateTime={note.date}>{patchDate(note.date)}</time>
                <span className="mx-3 text-[#b48da6]">/</span>Made for making.
              </p>
            </div>
            <div className="mx-auto w-full max-w-[340px] md:scale-110">
              <ReleaseArt />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 bg-black/10 px-6 py-4 font-mono text-[11px] sm:px-9">
            <span className="text-[#e1cedb]">
              {String(note.sections.length).padStart(2, "0")} chapters{" "}
              <span className="mx-2 text-[#b48da6]">/</span> {changeCount}{" "}
              things to explore
            </span>
            <a
              href="#release-details"
              className="rounded-sm text-[#f6c4d6] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Explore the release ↓
            </a>
          </div>
        </header>

        <div id="release-details" className="scroll-mt-6 pt-10">
          <div className="mb-5 flex items-center gap-4">
            <h3 className="shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-primary-soft-foreground">
              Inside this release
            </h3>
            <div className="h-px flex-1 bg-border" />
            <span aria-hidden="true" className="text-primary">
              ✦
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {note.sections.map((section, index) => {
              const look = sectionLooks[section.title];
              const wide =
                index === note.sections.length - 1 &&
                note.sections.length % 2 === 1;
              return (
                <section
                  key={section.title}
                  className={`rounded-xl border bg-[#fffdfb] p-6 sm:p-7 ${wide ? "md:col-span-2" : ""}`}
                >
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-2xl ${look?.color ?? "bg-secondary"}`}
                      >
                        {look?.symbol ?? "✦"}
                      </span>
                      <div>
                        {look && (
                          <p className="mb-1 font-mono text-[10px] text-primary-soft-foreground">
                            {look.caption}
                          </p>
                        )}
                        <Heading
                          as="h4"
                          size="title"
                          className="leading-tight tracking-normal"
                        >
                          {section.title}
                        </Heading>
                      </div>
                    </div>
                    <span
                      aria-hidden="true"
                      className="font-mono text-xs text-primary-soft-foreground"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <ul
                    className={`grid gap-x-8 gap-y-3 ${wide ? "md:grid-cols-2" : ""}`}
                  >
                    {section.changes.map((change) => (
                      <li
                        key={change}
                        className="flex items-start gap-3 text-[13px] leading-6 text-[#65545f]"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-[9px] size-1.5 shrink-0 bg-[#c98ba3]"
                        />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t pt-6">
          <div>
            <p className="font-display text-xl">
              Your next little masterpiece awaits.
            </p>
            <p className="mt-1 text-xs text-[#65545f]">
              Thanks for making Pigxel part of your process.
            </p>
          </div>
          <Link
            href="/tiles/new"
            className="rounded-lg bg-foreground px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Make something{" "}
            <span aria-hidden="true" className="ml-3">
              ↗
            </span>
          </Link>
        </footer>
      </article>
    </Page>
  );
}
