"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@pigxel/ui/components/badge";
import { Button } from "@pigxel/ui/components/button";
import { Text } from "@pigxel/ui/components/typography";
import { PremiumBadge } from "@/features/billing/components/premium-badge";
import type { PackCard as Pack } from "../../server";
import { AssetImage } from "../asset-image";
import { PackEditDialog } from "../pack-edit-dialog";

/** Every pack, with what admins change about it. */
export function AdminPackList({ packs }: { packs: Pack[] }) {
  const [editing, setEditing] = useState<Pack | null>(null);
  return (
    <>
      <ul className="divide-y rounded-2xl border bg-card">
        {packs.map((pack) => (
          <li key={pack.id} className="flex items-center gap-4 p-3">
            <span
              className="grid size-14 shrink-0 grid-cols-2 gap-0.5 rounded-lg bg-pastel-pink p-1"
              style={
                pack.background ? { background: pack.background } : undefined
              }
            >
              {pack.previews.map((asset) => (
                <AssetImage key={asset.id} asset={asset} className="w-full" />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-semibold">{pack.name}</span>
                {pack.premium && <PremiumBadge />}
                {pack.size && <Badge tone="muted">{pack.size}</Badge>}
              </span>
              <Text size="xs" tone="muted" className="block truncate">
                <span className="font-mono">{pack.id}</span> · {pack.count}{" "}
                assets · {pack.tags.length} tags ·{" "}
                {pack.description ? "described" : "no description"}
              </Text>
            </span>
            <Link
              href={`/internal/admin/packs/${pack.id}`}
              className="text-sm text-link-accent hover:underline"
            >
              Assets
            </Link>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setEditing(pack)}
            >
              Edit pack
            </Button>
          </li>
        ))}
      </ul>
      {editing && (
        <PackEditDialog pack={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
