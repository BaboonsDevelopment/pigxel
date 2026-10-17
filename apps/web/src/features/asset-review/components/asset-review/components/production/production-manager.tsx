"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { Notice } from "@pigxel/ui/components/notice";
import { useProduction } from "../../../../use-asset-review";
import { GRID } from "../../constants";
import { errorText } from "../../helpers";
import { PackSettings } from "./pack-settings";
import { PackSidebar } from "./pack-sidebar";
import { ProductionCard } from "./production-card";
import { SelectionBar } from "./selection-bar";

/**
 * The In production tab: what's on the Assets page, by pack. Pick a pack to
 * edit it, select assets to move, tag, reorder or delete them, or search to
 * find assets in any pack.
 */
export function ProductionManager({ background }: { background: string }) {
  const production = useProduction();
  const [packId, setPackId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const catalog = production.data;
  const pack =
    catalog?.packs.find((p) => p.id === packId) ?? catalog?.packs[0] ?? null;
  const query = search.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!catalog) return [];
    if (query)
      return catalog.assets.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.id.includes(query) ||
          a.tags.some((t) => t.includes(query)),
      );
    return catalog.assets.filter((a) => a.packId === pack?.id);
  }, [catalog, query, pack?.id]);

  if (production.isPending)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (production.isError)
    return <Notice tone="error">{errorText(production.error)}</Notice>;
  const { packs, assets, tags } = production.data;

  // Assets deleted or refreshed away drop out of the selection.
  const live = selected.filter((id) => assets.some((a) => a.id === id));
  const toggle = (id: string) =>
    setSelected(
      live.includes(id) ? live.filter((s) => s !== id) : [...live, id],
    );
  const allShown = shown.length > 0 && shown.every((a) => live.includes(a.id));
  const toggleAll = () =>
    setSelected(
      allShown
        ? live.filter((id) => !shown.some((a) => a.id === id))
        : [...new Set([...live, ...shown.map((a) => a.id)])],
    );
  const packOf = new Map(packs.map((p) => [p.id, p]));

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <PackSidebar
        packs={packs}
        assets={assets}
        current={query ? null : (pack?.id ?? null)}
        search={search}
        onSearch={setSearch}
        onPick={(id) => {
          setSearch("");
          setPackId(id);
        }}
      />
      <div className="min-w-0">
        {!query && pack && (
          <PackSettings
            key={pack.id}
            pack={pack}
            count={assets.filter((a) => a.packId === pack.id).length}
          />
        )}
        {query && (
          <p className="mb-4 text-sm text-muted-foreground">
            {shown.length} {shown.length === 1 ? "asset" : "assets"} matching “
            {search.trim()}” in all packs
          </p>
        )}
        <SelectionBar
          selected={live}
          packs={packs}
          assets={assets}
          tags={tags}
          allShown={allShown}
          anyShown={shown.length > 0}
          onToggleAll={toggleAll}
          onClear={() => setSelected([])}
        />
        {shown.length ? (
          <ul className={GRID}>
            {shown.map((asset) => (
              <ProductionCard
                key={asset.id}
                asset={asset}
                pack={query ? packOf.get(asset.packId) : undefined}
                tags={tags}
                selected={live.includes(asset.id)}
                onToggle={() => toggle(asset.id)}
                background={background}
                tint={packOf.get(asset.packId)?.background ?? null}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            title={query ? "No assets match" : "No assets in this pack"}
            description={
              query
                ? undefined
                : "Search for assets and move them here. Empty packs don’t show on the Assets page."
            }
          />
        )}
      </div>
    </div>
  );
}
