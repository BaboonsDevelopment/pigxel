import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@pigxel/ui/components/button";
import { Badge } from "@pigxel/ui/components/badge";
import { cardVariants } from "@pigxel/ui/components/card";
import {
  Heading,
  Lead,
  linkVariants,
  Text,
} from "@pigxel/ui/components/typography";
import { ScaledPage } from "@/components/layout/scaled-page";
import { StartGuideButton } from "@/features/tutorials/components/start-guide-button";
import { TutorialVideo } from "@/features/tutorials/components/tutorial-video";
import { findAsset } from "@/features/assets/server";
import { listTutorialVideos } from "@/features/tutorials/server";
import { TutorialVideoForm } from "@/features/tutorials/components/tutorial-video-form";
import { isAdmin, requireUser } from "@/lib/auth/session";
import { hasPremiumAccess } from "@/features/billing/server";
import { findTutorial } from "@/features/tutorials/tutorials";

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
  const user = await requireUser();
  const videos = await listTutorialVideos();
  const youtubeId = videos.get(tutorial.slug) ?? tutorial.youtubeId;
  const locked = !!tutorial.premium && !(await hasPremiumAccess(user));
  const asset =
    practice.asset && !locked ? await findAsset(practice.asset) : null;

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
        {tutorial.premium && (
          <Badge tone="primary" className="ml-2 align-middle">
            Premium
          </Badge>
        )}
      </Text>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          {locked && youtubeId ? (
            <div className="flex aspect-video items-center justify-center rounded-2xl border bg-pastel-lavender p-6 text-center">
              <Link href="/pricing" className={buttonVariants()}>
                Upgrade to watch this lesson
              </Link>
            </div>
          ) : (
            <TutorialVideo tutorial={{ ...tutorial, youtubeId }} />
          )}
          {isAdmin(user) && (
            <TutorialVideoForm slug={tutorial.slug} youtubeId={youtubeId} />
          )}
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
            {locked ? (
              <div className="rounded-lg bg-white/70 p-4">
                <p className="font-semibold">A premium tutorial</p>
                <Text size="sm" tone="muted" className="mt-1">
                  Artist and all Pro token levels unlock every premium tutorial
                  and asset, including the practice sprite for this one.
                </Text>
                <Link
                  href="/pricing"
                  className={buttonVariants({ className: "mt-3 w-full" })}
                >
                  See plans
                </Link>
              </div>
            ) : (
              <StartGuideButton
                userId={user.id}
                slug={tutorial.slug}
                asset={asset}
              />
            )}
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
