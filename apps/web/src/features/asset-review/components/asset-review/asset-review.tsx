"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { Notice } from "@pigxel/ui/components/notice";
import { Page } from "@pigxel/ui/components/page";
import { usePublishStatus, useReviewActions, useReviewSnapshot } from "../../use-asset-review";
import { loadPreview, previewUrl } from "../../preview-loader";
import { BlockSection } from "./components/block-section";
import { ProductionManager } from "./components/production/production-manager";
import { ReportList } from "./components/report-list";
import { ReviewHeader } from "./components/review-header";
import { BACKGROUNDS, FILTERS, type Filter, type View } from "./constants";
import { errorText, isPublishable, matchesFilter } from "./helpers";

const BATCH_SIZE = 16;

export function AssetReview({ view, filter }: { view: View; filter: Filter }) {
  const publishStatus = usePublishStatus();
  const snapshot = useReviewSnapshot(!!publishStatus.data?.running);
  const { publish } = useReviewActions();
  const [backgroundId, setBackgroundId] = useState(BACKGROUNDS[0]!.id);
  const [batch, setBatch] = useState({ filter, count: BATCH_SIZE });
  const [publishing, setPublishing] = useState(false);
  const [report, setReport] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const blocks = snapshot.data?.blocks ?? [];
  const targets = snapshot.data?.targets ?? [];
  const tiles = blocks.flatMap((block) => block.tiles);
  const counts = Object.fromEntries(
    FILTERS.map((f) => [
      f.id,
      tiles.filter((t) => matchesFilter(t, f.id)).length,
    ]),
  ) as Record<Filter, number>;
  const background =
    BACKGROUNDS.find((b) => b.id === backgroundId)?.className ??
    BACKGROUNDS[0]!.className;
  const shown = blocks
    .map((block) => ({
      block,
      tiles: block.tiles.filter((t) => matchesFilter(t, filter)),
    }))
    .filter(({ tiles }) => tiles.length > 0);
  const shownCount = shown.reduce((count, { tiles }) => count + tiles.length, 0);
  const visibleCount = batch.filter === filter ? batch.count : BATCH_SIZE;
  const visible = shown.reduce<{ remaining: number; blocks: typeof shown }>(
    (state, { block, tiles }) => {
      const slice = tiles.slice(0, state.remaining);
      return {
        remaining: state.remaining - slice.length,
        blocks: slice.length
          ? [...state.blocks, { block, tiles: slice }]
          : state.blocks,
      };
    },
    { remaining: visibleCount, blocks: [] },
  ).blocks;

  useEffect(() => {
    if (view !== "review" || visibleCount >= shownCount) return;
    const timer = setTimeout(
      () => setBatch({ filter, count: visibleCount + BATCH_SIZE }),
      80,
    );
    return () => clearTimeout(timer);
  }, [filter, view, visibleCount, shownCount]);

  useEffect(() => {
    if (view !== "review" || !snapshot.data) return;
    for (const block of snapshot.data.blocks)
      for (const tile of block.tiles)
        if (matchesFilter(tile, filter) && tile.w)
          void loadPreview(previewUrl(tile.pack, tile.id, tile.hash)).catch(() => {});
  }, [snapshot.data, filter, view]);

  const runPublish = async () => {
    setPublishing(true);
    setReport(null);
    try {
      setReport({ ok: true, text: await publish() });
    } catch (e) {
      setReport({ ok: false, text: errorText(e) });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Page className="max-w-[100rem] px-5 pt-3 pb-12 md:px-8 md:pt-2 xl:px-10">
      <ReviewHeader
        view={view}
        filter={filter}
        counts={counts}
        background={backgroundId}
        onBackground={setBackgroundId}
        publishable={tiles.filter(isPublishable).length}
        publishing={publishing || !!publishStatus.data?.running}
        onPublish={runPublish}
      />
      <div className="mb-6 flex flex-col gap-3 empty:hidden">
        {publishStatus.data?.running && (
          <Notice tone="info">
            {publishStatus.data.phase === "building" ? "Preparing assets" : "Publishing assets"}
            {publishStatus.data.total > 0 &&
              ` · ${publishStatus.data.completed}/${publishStatus.data.total}`}
            {publishStatus.data.message && ` · ${publishStatus.data.message}`}
          </Notice>
        )}
        {!publishStatus.data?.running && publishStatus.data?.phase === "error" && !report && (
          <Notice tone="error">{publishStatus.data.message}</Notice>
        )}
        {report && (
          <Notice tone={report.ok ? "success" : "error"} className="relative">
            <pre className="overflow-x-auto pr-16 font-mono text-xs whitespace-pre-wrap">
              {report.text}
            </pre>
            <button
              type="button"
              onClick={() => setReport(null)}
              className="absolute top-2 right-2 rounded-md px-2 py-1 text-xs hover:bg-black/5"
            >
              Close
            </button>
          </Notice>
        )}
        {snapshot.data?.productionError && (
          <Notice tone="error">{snapshot.data.productionError}</Notice>
        )}
        {snapshot.isError && (
          <Notice tone="error">{errorText(snapshot.error)}</Notice>
        )}
      </div>
      {view === "reports" ? (
        <ReportList />
      ) : view === "production" ? (
        <ProductionManager background={background} />
      ) : snapshot.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : shown.length ? (
        <>
          {visible.map(({ block, tiles }) => (
            <BlockSection
              key={block.id}
              block={block}
              targets={targets}
              tiles={tiles}
              background={background}
            />
          ))}
          {visibleCount < shownCount && (
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Preparing {Math.min(visibleCount, shownCount)} of {shownCount} cards…
            </p>
          )}
        </>
      ) : (
        <EmptyState
          title={filter === "todo" ? "Nothing to review" : "Nothing here"}
          description="Ask Claude to draw a pack, and it shows up here."
        />
      )}
    </Page>
  );
}
