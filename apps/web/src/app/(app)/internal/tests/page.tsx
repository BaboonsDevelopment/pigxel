import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ReviewKeyForm } from "@/features/asset-review/components/review-key-form";
import { REVIEW_COOKIE } from "@/features/asset-review/constants";
import { isReviewKey, isReviewOpen } from "@/features/asset-review/server";
import { parseSuite } from "@/features/test-runs/components/test-runs/helpers";
import { TestRuns } from "@/features/test-runs/components/test-runs/test-runs";

export const metadata: Metadata = {
  title: "Tests · Pigxel",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ suite?: string }> };

// Shares the asset review's gate: dev only, behind ASSETS_REVIEW_KEY.
export default async function TestsPage({ searchParams }: Props) {
  if (!isReviewOpen()) notFound();
  const key = (await cookies()).get(REVIEW_COOKIE)?.value;
  if (!isReviewKey(key)) return <ReviewKeyForm title="Tests" />;
  const { suite } = await searchParams;
  return <TestRuns suite={parseSuite(suite)} />;
}
