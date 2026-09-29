"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@pigxel/ui/components/button";
import { cn } from "@pigxel/ui/lib/utils";
import { createDraft } from "@/lib/pigxel-file/draft";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import {
  MAX_PIGXEL_SIZE,
  PIGXEL_EXTENSION,
  blankImage,
  serializePigxel,
  type Background,
} from "@/lib/pigxel-file/format";
import { connectDriveUrl, type DriveStatus } from "@/lib/google-drive/status";
import { CloudError, saveCloudTile } from "@/lib/pigxel-file/cloud";
import { DriveError, saveDriveFile } from "@/lib/pigxel-file/google-drive";
import type { TileLocation } from "@/lib/pigxel-file/location";
import { thumbnailDataUrl } from "@/lib/pigxel-file/thumbnail";
import { useIsClient } from "@/lib/use-is-client";

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
    swatch:
      "bg-[repeating-conic-gradient(#d4d4d4_0_25%,#fff_0_50%)] bg-[length:10px_10px]",
  },
  { value: "white", label: "White", swatch: "bg-white" },
  { value: "black", label: "Black", swatch: "bg-black" },
];

const optionCard =
  "flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/60 has-checked:border-primary has-checked:ring-1 has-checked:ring-primary has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:ring-2 has-focus-visible:ring-ring";

type FormProps = {
  userId: string;
  drive: DriveStatus;
  /** Connecting Google Drive was cancelled or failed on the way back. */
  driveError?: boolean;
};

/** The new-tile setup: name, size, background, and where the tile is stored. */
export function NewTileForm(props: FormProps) {
  if (!useIsClient()) return <div className="min-h-96" />;
  return <Form {...props} />;
}

function Form({ userId, drive, driveError }: FormProps) {
  const router = useRouter();
  const [name, setName] = useState("Untitled");
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
    const image = blankImage(w, h, background);
    const file = serializePigxel(image);
    let location: TileLocation | null = null;
    setBusy(true);
    setError(null);
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
    // Every new tile gets its own draft; other tiles are left as they are.
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
    router.push(editorUrl(draft.id));
  };

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
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
        <div className="flex max-w-sm items-center rounded-md border bg-background pr-3 focus-within:ring-2 focus-within:ring-ring">
          <input
            id="tile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
          />
          <span className="text-sm text-muted-foreground">
            {PIGXEL_EXTENSION}
          </span>
        </div>
      </Field>

      <Field label="Size" hint={`In pixels, up to ${MAX_PIGXEL_SIZE}.`}>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={width === String(n) && height === String(n)}
              onClick={() => {
                setWidth(String(n));
                setHeight(String(n));
              }}
              className="h-9 rounded-md border px-3 text-sm tabular-nums hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {n}×{n}
            </button>
          ))}
          <span className="mx-2 h-6 w-px bg-border" aria-hidden="true" />
          <input
            aria-label="Width"
            type="number"
            min={1}
            max={MAX_PIGXEL_SIZE}
            required
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="h-9 w-16 rounded-md border bg-background text-center text-sm tabular-nums"
          />
          <span className="text-muted-foreground">×</span>
          <input
            aria-label="Height"
            type="number"
            min={1}
            max={MAX_PIGXEL_SIZE}
            required
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="h-9 w-16 rounded-md border bg-background text-center text-sm tabular-nums"
          />
        </div>
      </Field>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">Background</legend>
        <div className="grid max-w-lg grid-cols-3 gap-3">
          {BACKGROUND_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(optionCard, "items-center")}
            >
              <input
                type="radio"
                name="background"
                value={option.value}
                checked={background === option.value}
                onChange={() => setBackground(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn("size-6 shrink-0 rounded border", option.swatch)}
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">Where to keep it</legend>
        <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
          <label className={optionCard}>
            <input
              type="radio"
              name="storage"
              value="cloud"
              checked={storage === "cloud"}
              onChange={() => setStorage("cloud")}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium">Pigxel cloud</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Saved to your Pigxel account and autosaved as you draw. Open it
                from any device.
              </span>
            </span>
          </label>
          <label className={optionCard}>
            <input
              type="radio"
              name="storage"
              value="drive"
              checked={storage === "drive"}
              disabled={!drive.connected}
              onChange={() => setStorage("drive")}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium">Google Drive</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {!drive.available ? (
                  "Google Drive isn’t set up for Pigxel yet."
                ) : drive.connected ? (
                  <>
                    Created in the Drive of{" "}
                    {drive.email ?? "your Google account"} and saved
                    automatically as you draw.
                  </>
                ) : (
                  <>
                    Link your Google account to keep tiles in your Drive.{" "}
                    <a
                      href={connectDriveUrl("/tiles/new")}
                      className="font-medium text-foreground underline underline-offset-4"
                    >
                      Connect Google Drive
                    </a>
                  </>
                )}
              </span>
            </span>
          </label>
          <label className={optionCard}>
            <input
              type="radio"
              name="storage"
              value="none"
              checked={storage === "none"}
              onChange={() => setStorage("none")}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium">Don’t store it</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Kept in this browser while you work. Download it or save it to
                Pigxel cloud{drive.available ? " or Google Drive" : ""} any
                time.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-5">
        <Button disabled={busy}>
          {busy
            ? storage === "cloud"
              ? "Creating in Pigxel cloud…"
              : storage === "drive"
                ? "Creating in Google Drive…"
                : "Creating…"
            : "Create tile"}
        </Button>
        <Link href="/tiles" className="text-sm underline underline-offset-4">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
