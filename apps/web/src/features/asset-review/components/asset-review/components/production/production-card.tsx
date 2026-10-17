"use client";

import { Badge } from "@pigxel/ui/components/badge";
import { cn } from "@pigxel/ui/lib/utils";
import { AssetImage } from "@/features/assets/components/asset-image";
import type {
  ProductionAsset,
  ProductionPack,
  ProductionTag,
} from "../../../../types";
import { CARD } from "../../constants";

/** A published asset; clicking it selects it. */
export function ProductionCard({
  asset,
  pack,
  tags,
  selected,
  onToggle,
  background,
  tint,
}: {
  asset: ProductionAsset;
  /** Shown when the list mixes packs (search). */
  pack?: ProductionPack;
  tags: ProductionTag[];
  selected: boolean;
  onToggle: () => void;
  background: string;
  tint: string | null;
}) {
  const tile = asset.kind === "tile";
  const names = asset.tags.map(
    (id) => tags.find((t) => t.id === id)?.name ?? id,
  );
  return (
    <li className={cn(CARD, selected && "ring-2 ring-primary")}>
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Select ${asset.name}`}
        onClick={onToggle}
        className="block w-full cursor-pointer text-left"
      >
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
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-2 right-2 flex size-5 items-center justify-center rounded border-2 border-white bg-black/20 text-xs text-white shadow transition-opacity",
              selected
                ? "border-primary bg-primary opacity-100"
                : "opacity-0 group-hover:opacity-100",
            )}
          >
            {selected && "✓"}
          </span>
          <span className="pointer-events-none absolute top-2 left-2 flex gap-1">
            {asset.premium && <Badge tone="primary">Premium</Badge>}
            {asset.frames > 1 && <Badge tone="overlay">Animated</Badge>}
          </span>
        </span>
        <span className="block border-t px-3 py-2">
          <span className="block truncate text-sm font-semibold">
            {asset.name}
          </span>
          <span className="block truncate font-mono text-[11px] text-muted-foreground">
            {pack ? `${pack.name} · ` : ""}
            {asset.id} · {asset.width}×{asset.height}
          </span>
          <span className="mt-1.5 flex min-h-5 flex-wrap gap-1">
            {names.length ? (
              names.map((name) => (
                <Badge key={name} tone="pink" size="md">
                  {name}
                </Badge>
              ))
            ) : (
              <span className="text-[11px] text-muted-foreground">No tags</span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}
