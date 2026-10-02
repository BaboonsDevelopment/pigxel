"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import { removeAsset } from "@/app/(app)/assets/actions";
import { confirmDialog } from "@/components/confirm-dialog/confirm-dialog";
import { useModifierLabel } from "@/components/tile-editor/use-modifier-label";
import {
  ASSET_CATEGORIES,
  assetBlob,
  assetFramePng,
  type Asset,
} from "@/lib/assets/assets";
import { downloadBlob } from "@/lib/download";
import { AssetImage } from "./asset-image";

/**
 * One asset up close, with the ways to use it: start a tile from it, copy it
 * to paste into a tile, or download it. Each fetches only the file it needs.
 * Admins can take it off the page.
 */
export function AssetDialog({
  asset,
  canRemove,
  onClose,
}: {
  asset: Asset;
  canRemove: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const mod = useModifierLabel();
  const category = ASSET_CATEGORIES.find((c) => c.id === asset.category);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const copy = () => {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      setStatus({
        error: true,
        text: "This browser won’t copy pictures. Use Edit › Insert asset… in the editor instead.",
      });
      return;
    }
    // The picture is handed over as a promise, so Safari keeps the click.
    navigator.clipboard
      .write([new ClipboardItem({ "image/png": assetFramePng(asset) })])
      .then(
        () => setStatus({ text: `Copied. Paste it into a tile with ${mod}V.` }),
        () => setStatus({ error: true, text: "Couldn’t copy it. Try again." }),
      );
  };

  const download = async (url: string, name: string) => {
    try {
      downloadBlob(await assetBlob(url), name);
    } catch {
      setStatus({ error: true, text: "Couldn’t download it. Try again." });
    }
  };

  const remove = async () => {
    const confirmed = await confirmDialog({
      title: `Remove “${asset.name}”?`,
      message:
        "It goes from the Assets page for everyone. Tiles already made from it keep their copy.",
      confirmLabel: "Remove",
    });
    if (!confirmed) return;
    const { error } = await removeAsset(asset.id);
    if (error) setStatus({ error: true, text: error });
    else dialog.current?.close();
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
          <AssetImage
            asset={asset}
            repeat={asset.category === "tiles"}
            className="max-h-full w-full"
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
                {category?.label} · {asset.width} × {asset.height}
                {asset.frames > 1 && ` · ${asset.frames} frames`}
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

          {asset.colors.length > 0 && (
            <ul aria-label="Colours" className="flex flex-wrap gap-1">
              {asset.colors.map((color) => (
                <li
                  key={color}
                  title={color}
                  className="size-5 rounded-[3px] ring-1 ring-black/10"
                  style={{ backgroundColor: color }}
                />
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2">
            <Link
              href={`/tiles/new?asset=${encodeURIComponent(asset.id)}`}
              className={buttonVariants()}
            >
              New tile from it
            </Link>
            <Button type="button" variant="secondary" onClick={copy}>
              Copy
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void download(asset.sheetUrl, `${asset.id}.png`)}
              >
                {asset.frames > 1 ? "PNG sheet" : "PNG"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  void download(asset.fileUrl, `${asset.id}.pigxel`)
                }
              >
                .pigxel
              </Button>
            </div>
          </div>

          <p
            role="status"
            className={
              status?.error
                ? "text-xs text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            {status?.text ??
              "In the editor, Edit › Insert asset… drops it onto the layer you’re drawing on."}
          </p>

          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void remove()}
              className="mt-auto self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Remove from Assets
            </Button>
          )}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
