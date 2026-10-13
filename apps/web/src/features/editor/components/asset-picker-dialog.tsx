"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { textLinkClassName } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { AssetImage } from "@/features/assets/components/asset-image";
import { ASSET_CATEGORIES, type Asset } from "@/features/assets/assets";
import { listAssetsInBrowser } from "@/features/assets/publish";

type Listing =
  | { state: "loading" }
  | { state: "ready"; assets: Asset[] }
  | { state: "error" };

type PickerProps = {
  onPick: (asset: Asset) => Promise<string | null>;
};

export default function AssetPickerDialog({
  onClose,
  ...props
}: PickerProps & { onClose: () => void }) {
  return (
    <Dialog onClose={onClose} size="lg" portal>
      <AssetPicker {...props} />
    </Dialog>
  );
}

function AssetPicker({ onPick }: PickerProps) {
  const { close } = useDialog();
  const [listing, setListing] = useState<Listing>({ state: "loading" });
  const [picking, setPicking] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
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
    else close();
  };

  const status = cn(
    "rounded-xl border bg-background px-4 py-6 text-center text-sm",
    listing.state === "error" ? "text-destructive" : "text-muted-foreground",
  );

  return (
    <>
      <ModalHeader title="Insert Asset" />
      <DialogBody className="grid gap-4 py-5">
        <p className="-mb-1 text-sm text-muted-foreground">
          It lands in the middle of the layer you’re drawing on, ready to move.
          Animations bring their first frame.
        </p>
        {problem && <FormMessage tone="error">{problem}</FormMessage>}
        {listing.state === "loading" ? (
          <p className={status}>Loading…</p>
        ) : listing.state === "error" ? (
          <p className={status}>
            Couldn’t load the assets. Close this and try again.
          </p>
        ) : listing.assets.length === 0 ? (
          <p className={status}>No assets yet.</p>
        ) : (
          <div>
            {ASSET_CATEGORIES.map((category) => {
              const assets = listing.assets.filter(
                (a) => a.category === category.id,
              );
              if (!assets.length) return null;
              return (
                <section key={category.id} className="mb-4 last:mb-0">
                  <h3 className="mb-2 text-sm font-semibold">
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
                          className="flex w-full flex-col items-center gap-1 rounded-xl p-1.5 text-xs transition-colors hover:bg-muted/60 focus-visible:outline-2 disabled:opacity-60 aria-busy:animate-pulse"
                        >
                          <span className="flex aspect-square w-full items-center justify-center rounded-lg border bg-checker p-2">
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
            })}
          </div>
        )}
      </DialogBody>
      <DialogFooter className={`${MODAL_FOOTER} items-center`}>
        <p className="mr-auto text-xs text-muted-foreground">
          Palettes are in the colour panel’s Load… menu.{" "}
          <Link href="/assets" target="_blank" className={textLinkClassName}>
            Browse all assets
          </Link>
        </p>
        <ModalButton variant="secondary" onClick={close}>
          Close
        </ModalButton>
      </DialogFooter>
    </>
  );
}
