import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cardVariants } from "@pigxel/ui/components/card";
import {
  Heading,
  Lead,
  linkVariants,
  Text,
} from "@pigxel/ui/components/typography";
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
      <Link href="/tutorials" className={linkVariants({ variant: "accent" })}>
        <span aria-hidden="true">←</span> All tutorials
      </Link>
      <Heading size="page" className="mt-2">
        {tutorial.title}
      </Heading>
      <Text size="xs" tone="muted" className="mt-1 font-mono">
        {tutorial.level} · {tutorial.minutes} min · {tutorial.steps.length}{" "}
        steps
      </Text>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <TutorialVideo tutorial={tutorial} />
          <Lead className="mt-4 max-w-prose">{tutorial.summary}</Lead>
        </div>

        <section
          aria-labelledby="guide-heading"
          className={cardVariants({ tone: "lavender" })}
        >
          <Heading id="guide-heading">Interactive guide</Heading>
          <Text tone="muted" className="mt-1">
            Opens a {practice.width} × {practice.height} practice tile, “
            {practice.name}”, kept in this browser. The guide points at each
            tool, and steps tick off by themselves as you do them.
          </Text>
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
                  <Text as="span" size="xs" tone="muted" className="block">
                    {step.body}
                  </Text>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </ScaledPage>
  );
}
