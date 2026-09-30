import type { Metadata } from "next";
import { Page } from "@pigxel/ui/components/page";
import { PageTitle } from "@pigxel/ui/components/typography";
import { PATCH_NOTES, patchDate } from "@/lib/patch-notes";
import { VersionSelect } from "./version-select";

export const metadata: Metadata = { title: "Patch notes · Pigxel" };

type Props = { searchParams: Promise<{ v?: string }> };

/** One release at a time: the newest, or the one picked with ?v=. */
export default async function PatchNotes({ searchParams }: Props) {
  const { v } = await searchParams;
  const note = PATCH_NOTES.find((n) => n.version === v) ?? PATCH_NOTES[0]!;
  const latest = note === PATCH_NOTES[0];

  return (
    <Page width="narrow">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle className="font-display">Patch notes</PageTitle>
        <VersionSelect
          value={note.version}
          versions={PATCH_NOTES.map((n, i) => ({
            version: n.version,
            label: `v${n.version}${i === 0 ? " (latest)" : ""}`,
          }))}
        />
      </div>

      <article className="mt-8 overflow-hidden rounded-2xl border bg-card">
        <header className="bg-linear-120 from-[#f8e3ec] to-[#efe6f8] px-6 py-6">
          <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="rounded-full bg-white/80 px-2 py-0.5 font-semibold text-foreground">
              v{note.version}
            </span>
            <time dateTime={note.date}>{patchDate(note.date)}</time>
            {latest && (
              <span className="rounded-full bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
                Latest
              </span>
            )}
          </p>
          <h2 className="mt-3 font-display text-3xl tracking-tight">
            {note.title}
          </h2>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            {note.summary}
          </p>
        </header>
        <div className="space-y-6 px-6 py-6">
          {note.sections.map((section) => (
            <section key={section.title}>
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {section.changes.map((change) => (
                  <li key={change} className="flex gap-2">
                    <span aria-hidden="true" className="text-primary">
                      ✦
                    </span>
                    {change}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </Page>
  );
}
