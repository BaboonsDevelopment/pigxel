import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AssetReview } from "@/features/asset-review/components/asset-review/asset-review";
import {
  parseFilter,
  parseView,
} from "@/features/asset-review/components/asset-review/helpers";
import { ReviewKeyForm } from "@/features/asset-review/components/review-key-form";
import { REVIEW_COOKIE } from "@/features/asset-review/constants";
import { isReviewKey, isReviewOpen } from "@/features/asset-review/server";

export const metadata: Metadata = {
  title: "Asset review · Pigxel",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ view?: string; filter?: string }> };

export default async function AssetReviewPage({ searchParams }: Props) {
  if (!isReviewOpen()) notFound();
  const key = (await cookies()).get(REVIEW_COOKIE)?.value;
  if (!isReviewKey(key)) return <ReviewKeyForm />;
  const { view, filter } = await searchParams;
  return <AssetReview view={parseView(view)} filter={parseFilter(filter)} />;
}
