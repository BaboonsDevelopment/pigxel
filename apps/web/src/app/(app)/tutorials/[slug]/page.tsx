import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScaledPage } from "@/components/scaled-page";
import { StartGuideButton } from "@/components/tutorials/start-guide-button";
import { TutorialVideo } from "@/components/tutorials/tutorial-video";
import { findAsset } from "@/lib/assets/server";
import { requireUser } from "@/lib/auth/session";
import { findTutorial } from "@/lib/tutorials/tutorials";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tutorial = findTutorial((await params).slug);
  return { title: `${tutorial?.title ?? "Tutorial"} · Pigxel` };
}

/**
 * One tutorial: its video, the interactive guide to start in the editor, and
 * the guide's steps written out.
 */
export default async function TutorialPage({ params }: Props) {
  const tutorial = findTutorial((await params).slug);
  if (!tutorial) notFound();
  const { practice } = tutorial;
  const [user, asset] = await Promise.all([
    requireUser(),
    practice.asset ? findAsset(practice.asset) : null,
  ]);

  return (
    <ScaledPage>
      <Link
        href="/tutorials"
        className="text-xs font-medium text-[#9a78d0] hover:underline"
      >
        <span aria-hidden="true">←</span> All tutorials
      </Link>
      <h1 className="mt-2 font-display text-4xl tracking-tight">
        {tutorial.title}
      </h1>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        {tutorial.level} · {tutorial.minutes} min · {tutorial.steps.length}{" "}
        steps
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <TutorialVideo tutorial={tutorial} />
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {tutorial.summary}
          </p>
        </div>

        <section
          aria-labelledby="guide-heading"
          className="rounded-2xl bg-[#e9e4f5] p-5"
        >
          <h2
            id="guide-heading"
            className="font-display text-xl tracking-tight"
          >
            Interactive guide
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Opens a {practice.width} × {practice.height} practice tile, “
            {practice.name}”, kept in this browser. The guide points at each
            tool, and steps tick off by themselves as you do them.
          </p>
          <div className="mt-4">
            <StartGuideButton
              userId={user.id}
              slug={tutorial.slug}
              asset={asset}
            />
          </div>
          <ol className="mt-5 space-y-2.5">
            {tutorial.steps.map((step, i) => (
              <li key={step.title} className="flex gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white font-mono text-xs tabular-nums">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-medium">{step.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {step.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </ScaledPage>
  );
}
