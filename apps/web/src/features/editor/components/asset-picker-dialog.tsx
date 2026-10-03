"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { SectionTitle } from "@pigxel/ui/components/typography";
import { AssetImage } from "@/components/assets/asset-image";
import { ASSET_CATEGORIES, type Asset } from "@/lib/assets/assets";
import { listAssetsInBrowser } from "@/lib/assets/publish";

type Listing =
  | { state: "loading" }
  | { state: "ready"; assets: Asset[] }
  | { state: "error" };

export default function AssetPickerDialog({
  onPick,
  onClose,
}: {
  onPick: (asset: Asset) => Promise<string | null>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [listing, setListing] = useState<Listing>({ state: "loading" });
  const [picking, setPicking] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
    let stale = false;
    listAssetsInBrowser().then(
      (assets) => !stale && setListing({ state: "ready", assets }),
      () => !stale && setListing({ state: "error" }),
    );
    return () => {
      stale = true;
    };
  }, []);

  const pick = async (asset: Asset) => {
    setPicking(asset.id);
    setProblem(null);
    const error = await onPick(asset);
    setPicking(null);
    if (error) setProblem(error);
    else dialog.current?.close();
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
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
          {problem}
        </FormMessage>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {listing.state === "loading" ? (
          <p className="py-6 text-sm text-muted-foreground">Loading…</p>
        ) : listing.state === "error" ? (
          <p className="py-6 text-sm text-destructive">
            Couldn’t load the assets. Close this and try again.
          </p>
        ) : listing.assets.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No assets yet.</p>
        ) : (
          ASSET_CATEGORIES.map((category) => {
            const assets = listing.assets.filter(
              (a) => a.category === category.id,
            );
            if (!assets.length) return null;
            return (
              <section key={category.id} className="mb-4">
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {category.label}
                </h3>
                <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {assets.map((asset) => (
                    <li key={asset.id}>
                      <button
                        type="button"
                        title={asset.name}
                        disabled={picking !== null}
                        aria-busy={picking === asset.id}
                        onClick={() => void pick(asset)}
                        className="flex w-full flex-col items-center gap-1 rounded-lg p-1.5 text-xs hover:bg-muted focus-visible:outline-2 disabled:opacity-60 aria-busy:animate-pulse"
                      >
                        <span className="flex aspect-square w-full items-center justify-center rounded-md bg-checker p-2">
                          <AssetImage asset={asset} className="w-full" />
                        </span>
                        <span className="w-full truncate text-center">
                          {asset.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
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
