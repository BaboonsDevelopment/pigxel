"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { textLinkClassName } from "@pigxel/ui/components/typography";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { UpgradeDialog } from "@/features/billing/components/upgrade-dialog";
import { loadAssetLibrary } from "@/features/assets/actions";
import { isLocked, type Asset } from "@/features/assets/assets";
import {
  AssetResults,
  AssetToolbar,
  useAssetFilters,
  useFavourites,
} from "@/features/assets/components/asset-browser";
import { NO_ASSET_FILTERS } from "@/features/assets/filters";

type Library = Awaited<ReturnType<typeof loadAssetLibrary>>;

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
  const [library, setLibrary] = useState<Library | "error" | null>(null);

  useEffect(() => {
    let stale = false;
    loadAssetLibrary().then(
      (loaded) => !stale && setLibrary(loaded),
      () => !stale && setLibrary("error"),
    );
    return () => {
      stale = true;
    };
  }, []);

  return (
    <>
      <ModalHeader title="Insert Asset" />
      {library === null || library === "error" ? (
        <DialogBody className="py-5">
          <p
            className={
              library === "error"
                ? "rounded-xl border bg-background px-4 py-6 text-center text-sm text-destructive"
                : "rounded-xl border bg-background px-4 py-6 text-center text-sm text-muted-foreground"
            }
          >
            {library === "error"
              ? "Couldn’t load the assets. Close this and try again."
              : "Loading…"}
          </p>
        </DialogBody>
      ) : (
        <Browser library={library} onPick={onPick} onDone={close} />
      )}
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

function Browser({
  library,
  onPick,
  onDone,
}: {
  library: Library;
  onPick: PickerProps["onPick"];
  onDone: () => void;
}) {
  const { filters, typed, setTyped, setFilters } =
    useAssetFilters(NO_ASSET_FILTERS);
  const favourites = useFavourites(library.favourites);
  const [picking, setPicking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<Asset | null>(null);
  const packs = useMemo(
    () =>
      new Map(library.packs.map((pack, index) => [pack.id, { pack, index }])),
    [library.packs],
  );

  const pick = async (asset: Asset) => {
    if (picking) return;
    if (isLocked(asset)) return setUpgrading(asset);
    setPicking(true);
    setProblem(null);
    const error = await onPick(asset);
    setPicking(false);
    if (error) setProblem(error);
    else onDone();
  };

  return (
    <DialogBody className="grid gap-4 py-5" aria-busy={picking}>
      <p className="-mb-1 text-sm text-muted-foreground">
        It lands in the middle of the layer you’re drawing on, ready to move.
        Animations bring their first frame.
      </p>
      <AssetToolbar
        typed={typed}
        onTyped={setTyped}
        placeholder="Search assets, packs or tags…"
        filters={filters}
        onFilters={setFilters}
        tags={library.tags}
        packs={library.packs}
      />
      {problem && <FormMessage tone="error">{problem}</FormMessage>}
      {favourites.error && (
        <FormMessage tone="error">{favourites.error}</FormMessage>
      )}
      <AssetResults
        title={
          filters.pack
            ? (packs.get(filters.pack)?.pack.name ?? "Assets")
            : "All assets"
        }
        grid="grid grid-cols-3 gap-3 sm:grid-cols-4"
        filters={filters}
        firstPage={null}
        packs={packs}
        favourites={favourites.assets}
        onFavourite={favourites.asset}
        onOpen={(asset) => void pick(asset)}
      />
      {upgrading && (
        <UpgradeDialog
          title="Premium asset"
          description={`“${upgrading.name}” is in a premium pack. Upgrade to drop it into your tiles.`}
          onClose={() => setUpgrading(null)}
        />
      )}
    </DialogBody>
  );
}
