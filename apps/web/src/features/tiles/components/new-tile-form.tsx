"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import { ChoiceCard, ChoiceText, Radio } from "@pigxel/ui/components/choice";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import {
  Input,
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@pigxel/ui/components/input";
import { textLinkClassName } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { AssetImage } from "@/features/assets/components/asset-image";
import { loadAssetDocument, type Asset } from "@/features/assets/assets";
import { PALETTE_PRESETS, type PalettePreset } from "@/lib/palette/presets";
import { createDraft, loadDrafts } from "@/lib/pigxel-file/draft";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { openTabAfter } from "@/lib/pigxel-file/tabs";
import {
  MAX_PIGXEL_SIZE,
  PIGXEL_EXTENSION,
  blankDocument,
  serializePigxel,
  type Background,
} from "@/lib/pigxel-file/format";
import { connectDriveUrl, type DriveStatus } from "@/lib/google-drive/status";
import { CloudError, saveCloudTile } from "@/lib/pigxel-file/cloud";
import { DriveError, saveDriveFile } from "@/lib/pigxel-file/google-drive";
import type { TileLocation } from "@/lib/pigxel-file/location";
import { thumbnailDataUrl } from "@/lib/pigxel-file/thumbnail";
import { useIsClient } from "@/lib/utils/use-is-client";

type Storage = "cloud" | "drive" | "none";

const PRESETS = [16, 32, 64, 128];
const BACKGROUND_OPTIONS: {
  value: Background;
  label: string;
  swatch: string;
}[] = [
  {
    value: "transparent",
    label: "Transparent",
    swatch: "bg-checker",
  },
  { value: "white", label: "White", swatch: "bg-white" },
  { value: "black", label: "Black", swatch: "bg-black" },
];

type FormProps = {
  userId: string;
  drive: DriveStatus;
  driveError?: boolean;
  asset?: Asset | null;
  paletteId?: string;
  from?: string;
};

export function NewTileForm({ asset, paletteId, ...props }: FormProps) {
  if (!useIsClient()) return <div className="min-h-96" />;
  return (
    <Form
      key={`${asset?.id}:${paletteId}`}
      {...props}
      asset={asset ?? null}
      palette={PALETTE_PRESETS.find((p) => p.id === paletteId) ?? null}
    />
  );
}

function Form({
  userId,
  drive,
  driveError,
  from,
  asset,
  palette,
}: Omit<FormProps, "asset" | "paletteId"> & {
  asset: Asset | null;
  palette: PalettePreset | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(asset?.name ?? "Untitled");
  const [width, setWidth] = useState("32");
  const [height, setHeight] = useState("32");
  const [background, setBackground] = useState<Background>("transparent");
  const [storage, setStorage] = useState<Storage>("cloud");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    driveError
      ? "Google Drive wasn’t connected. Try again when you’re ready."
      : null,
  );

  const size = (value: string) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= MAX_PIGXEL_SIZE ? n : null;
  };

  const create = async (w: number, h: number) => {
    setBusy(true);
    setError(null);
    let image;
    try {
      image = asset
        ? await loadAssetDocument(asset)
        : blankDocument(w, h, background);
    } catch {
      setError("Couldn’t load the asset. Try again.");
      setBusy(false);
      return;
    }
    if (palette && !asset) image.palette = [...palette.colors];
    const file = serializePigxel(image);
    let location: TileLocation | null = null;
    try {
      if (storage === "cloud")
        location = {
          kind: "cloud",
          tile: await saveCloudTile(
            { name },
            file,
            image,
            thumbnailDataUrl(image),
          ),
        };
      if (storage === "drive")
        location = {
          kind: "drive",
          file: await saveDriveFile({ name }, file),
        };
    } catch (e) {
      setError(
        e instanceof DriveError || e instanceof CloudError
          ? e.message
          : "Couldn’t create the tile. Try again.",
      );
      setBusy(false);
      return;
    }
    await loadDrafts(userId);
    const draft = createDraft(userId, {
      name,
      file,
      location,
      dirty: false,
    });
    if (!draft) {
      setError(
        location
          ? "The tile was saved, but this browser won’t keep a working copy. Allow site data for Pigxel, or remove some tiles from this browser, and open it from My projects."
          : "This browser won’t keep the tile. Allow site data for Pigxel, or remove some tiles from this browser.",
      );
      setBusy(false);
      return;
    }
    if (from) openTabAfter(userId, draft.id, from);
    router.push(editorUrl(draft.id));
  };

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (asset) {
          void create(asset.width, asset.height);
          return;
        }
        const w = size(width);
        const h = size(height);
        if (!w || !h) {
          setError(`Use a size from 1 to ${MAX_PIGXEL_SIZE} pixels.`);
          return;
        }
        void create(w, h);
      }}
    >
      <Field label="Name" htmlFor="tile-name">
        <InputGroup className="max-w-sm">
          <InputGroupInput
            id="tile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
          />
          <InputGroupText>{PIGXEL_EXTENSION}</InputGroupText>
        </InputGroup>
      </Field>

      {asset ? (
        <StartingAsset asset={asset} />
      ) : (
        <>
          <Field label="Size" hint={`In pixels, up to ${MAX_PIGXEL_SIZE}.`}>
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant="secondary"
                  aria-pressed={width === String(n) && height === String(n)}
                  onClick={() => {
                    setWidth(String(n));
                    setHeight(String(n));
                  }}
                  className="tabular-nums"
                >
                  {n}×{n}
                </Button>
              ))}
              <span className="mx-2 h-6 w-px bg-border" aria-hidden="true" />
              <Input
                aria-label="Width"
                type="number"
                min={1}
                max={MAX_PIGXEL_SIZE}
                required
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="h-9 w-16 px-1 text-center tabular-nums"
              />
              <span className="text-muted-foreground">×</span>
              <Input
                aria-label="Height"
                type="number"
                min={1}
                max={MAX_PIGXEL_SIZE}
                required
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="h-9 w-16 px-1 text-center tabular-nums"
              />
            </div>
          </Field>

          <fieldset>
            <legend className="mb-3 text-sm font-medium">Background</legend>
            <div className="grid max-w-lg grid-cols-3 gap-3">
              {BACKGROUND_OPTIONS.map((option) => (
                <ChoiceCard key={option.value} className="items-center">
                  <Radio
                    name="background"
                    value={option.value}
                    checked={background === option.value}
                    onChange={() => setBackground(option.value)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-6 shrink-0 rounded border",
                      option.swatch,
                    )}
                  />
                  <span className="text-sm">{option.label}</span>
                </ChoiceCard>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {palette && !asset && (
        <Field label="Palette">
          <div className="flex max-w-lg items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-6 flex-1 overflow-hidden rounded ring-1 ring-black/10"
            >
              {palette.colors.map((color) => (
                <span
                  key={color}
                  className="flex-1"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            <span className="shrink-0 text-sm">{palette.name}</span>
          </div>
        </Field>
      )}

      <fieldset>
        <legend className="mb-3 text-sm font-medium">Where to keep it</legend>
        <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
          <ChoiceCard>
            <Radio
              name="storage"
              value="cloud"
              checked={storage === "cloud"}
              onChange={() => setStorage("cloud")}
            />
            <ChoiceText title="Pigxel cloud">
              Saved to your Pigxel account and autosaved as you draw. Open it
              from any device.
            </ChoiceText>
          </ChoiceCard>
          <ChoiceCard>
            <Radio
              name="storage"
              value="drive"
              checked={storage === "drive"}
              disabled={!drive.connected}
              onChange={() => setStorage("drive")}
            />
            <ChoiceText title="Google Drive">
              {!drive.available ? (
                "Google Drive isn’t set up for Pigxel yet."
              ) : drive.connected ? (
                <>
                  Created in the Drive of {drive.email ?? "your Google account"}{" "}
                  and saved automatically as you draw.
                </>
              ) : (
                <>
                  Link your Google account to keep tiles in your Drive.{" "}
                  <a
                    href={connectDriveUrl("/tiles/new")}
                    className={textLinkClassName}
                  >
                    Connect Google Drive
                  </a>
                </>
              )}
            </ChoiceText>
          </ChoiceCard>
          <ChoiceCard>
            <Radio
              name="storage"
              value="none"
              checked={storage === "none"}
              onChange={() => setStorage("none")}
            />
            <ChoiceText title="Don’t store it">
              Kept in this browser while you work. Download it or save it to
              Pigxel cloud{drive.available ? " or Google Drive" : ""} any time.
            </ChoiceText>
          </ChoiceCard>
        </div>
      </fieldset>

      {error && <FormMessage tone="error">{error}</FormMessage>}

      <div className="flex items-center gap-3">
        <Button size="lg" disabled={busy}>
          {busy
            ? storage === "cloud"
              ? "Creating in Pigxel cloud…"
              : storage === "drive"
                ? "Creating in Google Drive…"
                : "Creating…"
            : "Create tile"}
        </Button>
        <Link
          href={from ? editorUrl(from) : "/tiles"}
          className={buttonVariants({ variant: "ghost", size: "lg" })}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function StartingAsset({ asset }: { asset: Asset }) {
  const { width: w, height: h, frames } = asset;
  return (
    <Field label="Starts from">
      <div className="flex max-w-sm items-center gap-4 rounded-xl border p-3">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-checker">
          <AssetImage asset={asset} className="w-12" />
        </span>
        <span className="min-w-0 text-sm">
          <span className="block font-semibold">{asset.name}</span>
          <span className="block text-muted-foreground tabular-nums">
            {w} × {h} pixels{frames > 1 && `, ${frames} frames`}
          </span>
          <Link
            href="/tiles/new"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Start blank instead
          </Link>
        </span>
      </div>
    </Field>
  );
}
