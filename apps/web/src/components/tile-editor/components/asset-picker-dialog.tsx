"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { SectionTitle } from "@pigxel/ui/components/typography";
import { AssetSprite } from "@/components/assets/asset-sprite";
import { ASSET_CATEGORIES, ASSETS, type Asset } from "@/lib/assets/assets";

/**
 * Edit › Insert asset…: the predefined sprites and tiles, one click puts one
 * on the tile. `onPick` says whether it could.
 */
export default function AssetPickerDialog({
  onPick,
  onClose,
}: {
  onPick: (asset: Asset) => boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [problem, setProblem] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const pick = (asset: Asset) => {
    if (onPick(asset)) dialog.current?.close();
    else setProblem(true);
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dimmed backdrop closes it.
        if (e.target === dialog.current) dialog.current.close();
      }}
      aria-labelledby="asset-picker-title"
      className="m-auto max-h-[min(40rem,calc(100dvh-2rem))] w-[min(36rem,calc(100vw-2rem))] flex-col rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40 open:flex"
    >
      <div className="flex items-center justify-between gap-4 px-5 pt-4">
        <SectionTitle id="asset-picker-title">Insert asset</SectionTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={() => dialog.current?.close()}
          className="text-lg leading-none"
        >
          ×
        </Button>
      </div>
      <p className="px-5 pt-1 text-sm text-muted-foreground">
        It lands in the middle of the layer you’re drawing on, ready to move.
        Animations bring their first frame.
      </p>
      {problem && (
        <FormMessage tone="error" className="px-5 pt-2">
          This layer can’t be drawn on. Pick an unlocked, visible layer first.
        </FormMessage>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {ASSET_CATEGORIES.map((category) => (
          <section key={category.id} className="mb-4">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {category.label}
            </h3>
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {ASSETS.filter((a) => a.category === category.id).map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    title={asset.name}
                    onClick={() => pick(asset)}
                    className="flex w-full flex-col items-center gap-1 rounded-lg p-1.5 text-xs hover:bg-muted focus-visible:outline-2"
                  >
                    <span className="flex aspect-square w-full items-center justify-center rounded-md bg-checker p-2">
                      <AssetSprite asset={asset} className="size-full" />
                    </span>
                    <span className="w-full truncate text-center">
                      {asset.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="border-t px-5 py-3 text-xs text-muted-foreground">
        Palettes are in the colour panel’s Load… menu.{" "}
        <Link
          href="/assets"
          target="_blank"
          className="underline underline-offset-2"
        >
          Browse all assets
        </Link>
      </p>
    </dialog>
  );
}
