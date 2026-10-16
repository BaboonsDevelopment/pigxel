"use client";

import { useState } from "react";
import { Badge } from "@pigxel/ui/components/badge";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { Notice } from "@pigxel/ui/components/notice";
import { SectionHeader } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { AssetImage } from "@/features/assets/components/asset-image";
import type { ProductionAsset, ReviewTarget } from "../../../types";
import { useProduction, useReviewActions } from "../../../use-asset-review";
import { CARD, GRID } from "../constants";
import { errorText } from "../helpers";
import { SwatchPicker } from "./swatch-picker";

function BlockBackground({ block }: { block: ReviewTarget }) {
  const { setProductionBackground } = useReviewActions();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const change = async (background: string | null) => {
    setPending(true);
    setError("");
    try {
      await setProductionBackground(block.id, background);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <SwatchPicker
        value={block.background}
        disabled={pending}
        onChange={change}
      />
    </div>
  );
}

function ProductionCard({
  asset,
  background,
  tint,
}: {
  asset: ProductionAsset;
  background: string;
  tint: string | null;
}) {
  const { removeFromProduction } = useReviewActions();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const tile = asset.kind === "tile";

  const remove = async () => {
    setPending(true);
    setError("");
    try {
      await removeFromProduction(asset.id);
    } catch (e) {
      setError(errorText(e));
      setPending(false);
    }
  };

  return (
    <li className={cn(CARD, confirming && "ring-2 ring-destructive")}>
      <span
        className={cn(
          "relative flex aspect-square items-center justify-center overflow-hidden",
          !tint && background,
        )}
        style={tint ? { background: tint } : undefined}
      >
        <AssetImage
          asset={asset}
          repeat={tile}
          className={tile ? "w-full" : "w-3/5"}
        />
        <span className="pointer-events-none absolute top-2 left-2 flex gap-1">
          {asset.premium && <Badge tone="primary">Premium</Badge>}
          {asset.frames > 1 && <Badge tone="overlay">Animated</Badge>}
        </span>
      </span>
      {confirming ? (
        <div className="flex items-center gap-1 border-t py-1.5 pr-1.5 pl-3">
          <span className="mr-auto truncate text-xs">Delete everywhere?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Keep
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="rounded-md bg-destructive px-2 py-1 text-xs text-white hover:bg-destructive/90 disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 border-t py-1.5 pr-1.5 pl-3">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {asset.name}
            </span>
            <span className="block truncate font-mono text-[11px] text-muted-foreground">
              {asset.id} · {asset.width}×{asset.height}
            </span>
          </span>
          <button
            type="button"
            aria-label={`Delete ${asset.name}`}
            title="Delete everywhere"
            onClick={() => setConfirming(true)}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M3 5.5h14M8 5.5V3.5h4v2M4.5 5.5l.8 11a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-11M8.5 9v5.5M11.5 9v5.5" />
            </svg>
          </button>
        </div>
      )}
      {error && <p className="px-3 pb-2 text-xs text-destructive">{error}</p>}
    </li>
  );
}

export function ProductionList({
  blocks,
  background,
}: {
  blocks: ReviewTarget[];
  background: string;
}) {
  const production = useProduction();

  if (production.isPending)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (production.isError)
    return <Notice tone="error">{errorText(production.error)}</Notice>;
  const sections = blocks
    .map((block) => ({
      block,
      assets: production.data.filter((a) => a.category === block.id),
    }))
    .filter(({ assets }) => assets.length > 0);
  if (!sections.length) return <EmptyState title="Nothing in production" />;
  return sections.map(({ block, assets }) => (
    <section
      key={block.id}
      aria-labelledby={`production-${block.id}`}
      className="mt-10 first:mt-0"
    >
      <SectionHeader
        id={`production-${block.id}`}
        title={block.name}
        actions={
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-muted-foreground">
              {block.id} · {assets.length}
            </span>
            <BlockBackground block={block} />
          </div>
        }
      />
      <ul className={GRID}>
        {assets.map((asset) => (
          <ProductionCard
            key={asset.id}
            asset={asset}
            background={background}
            tint={block.background}
          />
        ))}
      </ul>
    </section>
  ));
}
