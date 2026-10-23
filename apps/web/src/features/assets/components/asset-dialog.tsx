"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/navigation/back-button";
import { useState } from "react";
import {
  Button,
  buttonVariants,
  IconButton,
} from "@pigxel/ui/components/button";
import { Dialog, useDialog } from "@pigxel/ui/components/dialog";
import { Heading, Text } from "@pigxel/ui/components/typography";
import { PremiumCrown } from "@/features/billing/components/premium-crown";
import { UpgradeDialog } from "@/features/billing/components/upgrade-dialog";
import { downloadBlob } from "@/lib/utils/download";
import { useModifierLabel } from "@/lib/utils/use-modifier-label";
import { recordAssetUse } from "../actions";
import { assetBlob, assetFramePng, isLocked, type Asset } from "../assets";
import { AssetImage } from "./asset-image";
import { FavouriteButton } from "./favourite-button";

type DialogProps = {
  asset: Asset;
  pack: { id: string; name: string; premium: boolean };
  tagNames: ReadonlyMap<string, string>;
  favourite: boolean;
  onFavourite: (on: boolean) => void;
  onPack: (packId: string) => void;
  onTag: (tagId: string) => void;
};

export function AssetDialog({
  onClose,
  ...props
}: DialogProps & { onClose: () => void }) {
  return (
    <Dialog
      onClose={onClose}
      size="lg"
      portal
      className="backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <AssetDetails {...props} />
    </Dialog>
  );
}

function AssetDetails({
  asset,
  pack,
  tagNames,
  favourite,
  onFavourite,
  onPack,
  onTag,
}: DialogProps) {
  const { close, titleId } = useDialog();
  const router = useRouter();
  const [status, setStatus] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const mod = useModifierLabel();
  const locked = isLocked(asset);
  const { tags } = asset;

  const copy = () => {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      setStatus({
        error: true,
        text: "This browser won’t copy pictures. Use Edit › Insert asset… in the editor instead.",
      });
      return;
    }
    navigator.clipboard
      .write([new ClipboardItem({ "image/png": assetFramePng(asset) })])
      .then(
        () => {
          setStatus({ text: `Copied. Paste it into a tile with ${mod}V.` });
          void recordAssetUse(asset.id, "copy").catch(() => {});
        },
        () => setStatus({ error: true, text: "Couldn’t copy it. Try again." }),
      );
  };

  const download = async (url: string, name: string) => {
    try {
      downloadBlob(await assetBlob(url), name);
      void recordAssetUse(asset.id, "download").catch(() => {});
    } catch {
      setStatus({ error: true, text: "Couldn’t download it. Try again." });
    }
  };

  const copyId = () =>
    navigator.clipboard?.writeText(asset.id).then(
      () => setStatus({ text: `Copied the id “${asset.id}”.` }),
      () => setStatus({ error: true, text: "Couldn’t copy the id." }),
    );

  /** Premium actions open the upgrade modal for people without a plan. */
  const gated = (action: () => void) => () =>
    locked ? setUpgrading(true) : action();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <BackButton
          onBack={() => {
            close();
            router.replace("/assets");
          }}
        >
          Back to Assets
        </BackButton>
        <IconButton
          label="Close"
          onClick={close}
          className="size-10 text-lg leading-none"
        >
          ×
        </IconButton>
      </div>
      <div className="min-h-0 overflow-y-auto sm:grid sm:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="relative flex aspect-square items-center justify-center bg-checker p-10">
          <AssetImage
            asset={asset}
            repeat={asset.kind === "tile"}
            className="max-h-full w-full"
          />
          {pack.premium && (
            <PremiumCrown
              locked={locked}
              className="absolute right-3 bottom-3"
            />
          )}
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Heading id={titleId} size="title">
                {asset.name}
              </Heading>
              <Text size="xs" tone="muted" className="mt-0.5 tabular-nums">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onPack(pack.id);
                  }}
                  className="font-semibold underline-offset-2 hover:text-foreground hover:underline"
                >
                  {pack.name}
                </button>{" "}
                · {asset.width} × {asset.height}
                {asset.frames > 1 && ` · ${asset.frames} frames`}
              </Text>
            </div>
            <div className="-mt-1 -mr-1 flex items-center gap-1">
              <FavouriteButton
                on={favourite}
                label={asset.name}
                onChange={onFavourite}
                className="shadow-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void copyId()}
            title="Copy the id"
            className="flex items-center gap-2 self-start rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {asset.id}
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="size-3"
              fill="none"
            >
              <rect
                x="5"
                y="5"
                width="8"
                height="9"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M3 10.5V3.5A1.5 1.5 0 0 1 4.5 2H10"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {tags.length > 0 && (
            <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onTag(tag);
                    }}
                    className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted"
                  >
                    {tagNames.get(tag) ?? tag}
                  </button>
                </li>
              ))}
            </ul>
          )}

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
            {locked ? (
              <Button type="button" onClick={() => setUpgrading(true)}>
                New tile from it
              </Button>
            ) : (
              <Link
                href={`/tiles/new?asset=${encodeURIComponent(asset.id)}`}
                className={buttonVariants()}
              >
                New tile from it
              </Link>
            )}
            <Button type="button" variant="secondary" onClick={gated(copy)}>
              Copy
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={gated(
                  () => void download(asset.sheetUrl, `${asset.id}.png`),
                )}
              >
                {asset.frames > 1 ? "PNG sheet" : "PNG"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={gated(
                  () =>
                    asset.fileUrl &&
                    void download(asset.fileUrl, `${asset.id}.pigxel`),
                )}
              >
                .pigxel
              </Button>
            </div>
          </div>

          <Text
            role="status"
            size="xs"
            tone={status?.error ? "error" : "muted"}
          >
            {status?.text ??
              (asset.uses > 0
                ? `Used by ${asset.uses} ${asset.uses === 1 ? "person" : "people"}.`
                : "In the editor, Edit › Insert asset… drops it onto the layer you’re drawing on.")}
          </Text>
        </div>
      </div>
      {upgrading && (
        <UpgradeDialog
          title="Premium pack"
          description={`“${pack.name}” comes with the paid plans. Upgrade to start tiles from its assets, copy and download them.`}
          onClose={() => setUpgrading(false)}
        />
      )}
    </div>
  );
}
