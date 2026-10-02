"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import {
  ASSET_CATEGORIES,
  assetPalette,
  assetPng,
  assetSize,
  type Asset,
} from "@/lib/assets/assets";
import { downloadBlob } from "@/lib/download";
import { useModifierLabel } from "@/components/tile-editor/use-modifier-label";
import { AssetSprite } from "./asset-sprite";

/**
 * One asset up close, with the ways to use it: start a tile from it, copy it
 * to paste into a tile, or download it.
 */
export function AssetDialog({
  asset,
  onClose,
}: {
  asset: Asset;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);
  const mod = useModifierLabel();
  const { w, h } = assetSize(asset);
  const frames = asset.frames.length;
  const category = ASSET_CATEGORIES.find((c) => c.id === asset.category);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const copy = () => {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      setCopied("failed");
      return;
    }
    // The picture is handed over as a promise, so Safari keeps the click.
    navigator.clipboard
      .write([
        new ClipboardItem({
          "image/png": assetPng(asset, { frame: 0 }).then((blob) => blob!),
        }),
      ])
      .then(
        () => setCopied("done"),
        () => setCopied("failed"),
      );
  };

  const download = async () => {
    const blob = await assetPng(asset);
    if (blob) downloadBlob(blob, `${asset.id}.png`);
  };

  // On <body>, outside the scaled page, so it fits the window.
  return createPortal(
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dimmed backdrop closes it.
        if (e.target === dialog.current) dialog.current.close();
      }}
      aria-labelledby="asset-dialog-title"
      className="m-auto w-[min(44rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="grid sm:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex aspect-square items-center justify-center bg-checker p-10">
          <AssetSprite
            asset={asset}
            repeat={asset.category === "tiles" ? 3 : 1}
            className="size-full"
          />
        </div>
        <div className="flex flex-col gap-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="asset-dialog-title"
                className="font-display text-2xl tracking-tight"
              >
                {asset.name}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                {category?.label} · {w} × {h}
                {frames > 1 && ` · ${frames} frames`}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close"
              onClick={() => dialog.current?.close()}
              className="-mt-1 -mr-1 text-lg leading-none"
            >
              ×
            </Button>
          </div>

          <ul aria-label="Colours" className="flex flex-wrap gap-1">
            {assetPalette(asset).map((color) => (
              <li
                key={color}
                title={color}
                className="size-5 rounded-[3px] ring-1 ring-black/10"
                style={{ backgroundColor: color }}
              />
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <Link
              href={`/tiles/new?asset=${asset.id}`}
              className={buttonVariants()}
            >
              New tile from it
            </Link>
            <Button type="button" variant="secondary" onClick={copy}>
              {copied === "done" ? "Copied" : "Copy"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void download()}
            >
              {frames > 1 ? "Download sprite sheet" : "Download PNG"}
            </Button>
          </div>

          <p role="status" className="text-xs text-muted-foreground">
            {copied === "failed"
              ? "This browser won’t copy pictures. Use Edit › Insert asset… in the editor instead."
              : copied === "done"
                ? `Paste it into any tile with ${mod}V.`
                : "In the editor, Edit › Insert asset… drops it onto the layer you’re drawing on."}
          </p>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
