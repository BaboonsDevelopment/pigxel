"use client";

import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Text } from "@pigxel/ui/components/typography";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { removeAsset } from "../../admin-actions";
import type { Asset } from "../../assets";
import type { AssetTag, PackCard as Pack } from "../../server";
import { AssetAdmin } from "../asset-admin";
import { AssetImage } from "../asset-image";
import { PackEditDialog } from "../pack-edit-dialog";

/** One pack's assets, each with its tags and admin actions. */
export function AdminPackAssets({
  pack,
  assets,
  tags,
}: {
  pack: Pack;
  assets: Asset[];
  tags: AssetTag[];
}) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Text tone="muted" className="flex-1">
          {pack.count} assets · {pack.premium ? "Premium" : "Free"}
          {pack.description && ` · ${pack.description}`}
        </Text>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setEditing(true)}
        >
          Edit pack
        </Button>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset) => (
          <AdminAsset key={asset.id} asset={asset} tags={tags} />
        ))}
      </ul>
      {editing && (
        <PackEditDialog pack={pack} onClose={() => setEditing(false)} />
      )}
    </>
  );
}

function AdminAsset({ asset, tags }: { asset: Asset; tags: AssetTag[] }) {
  const [assetTags, setAssetTags] = useState(asset.tags);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    const confirmed = await confirmDialog({
      title: `Remove “${asset.name}”?`,
      message:
        "It goes from the Assets page for everyone. Tiles already made from it keep their copy.",
      confirmLabel: "Remove",
    });
    if (!confirmed) return;
    const { error } = await removeAsset(asset.id);
    if (error) setError(error);
  };

  return (
    <li className="grid gap-3 rounded-2xl border bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-checker p-1.5">
          <AssetImage
            asset={asset}
            repeat={asset.kind === "tile"}
            className="w-full"
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{asset.name}</span>
          <Text size="xs" tone="muted" className="block truncate font-mono">
            {asset.id} · {asset.width}×{asset.height}
            {asset.frames > 1 && ` · ${asset.frames} frames`}
          </Text>
        </span>
      </div>
      <AssetAdmin
        assetId={asset.id}
        tags={assetTags}
        onTags={setAssetTags}
        allTags={tags}
      />
      {error && (
        <Text size="xs" tone="error">
          {error}
        </Text>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void remove()}
        className="self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        Remove from Assets
      </Button>
    </li>
  );
}
