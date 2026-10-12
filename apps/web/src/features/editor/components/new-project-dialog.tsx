"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { textLinkClassName } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { PixelImage } from "@/components/ui/pixel-image";
import { createTile } from "@/features/tiles/create-tile";
import {
  readNewTileDefaults,
  type NewTileStorage,
} from "@/features/tiles/new-tile-defaults";
import { connectDriveUrl, type DriveStatus } from "@/lib/google-drive/status";
import { MAX_PIGXEL_SIZE } from "@/lib/pigxel-file/format";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { openTabAfter } from "@/lib/pigxel-file/tabs";
import { SIZE_LABEL, SizeField } from "./size-controls";

type Fill = "transparent" | "white" | "custom";

const option = (on: boolean) =>
  cn(
    "flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-1.5 text-sm whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-50",
    on
      ? "border-primary-soft bg-pastel-pink-soft font-semibold"
      : "bg-background hover:bg-pink-base",
  );

const STORAGE: { value: NewTileStorage; label: string; hint: string }[] = [
  {
    value: "cloud",
    label: "Pigxel cloud",
    hint: "Saved to your Pigxel account and autosaved as you draw.",
  },
  {
    value: "drive",
    label: "Google Drive",
    hint: "Created in your Google Drive and saved as you draw.",
  },
  {
    value: "none",
    label: "This browser",
    hint: "Kept in this browser. Save it to the cloud or Drive any time.",
  },
];

export function NewProjectDialog({
  userId,
  from,
  drive,
  onClose,
}: {
  userId: string;
  from: string;
  drive: DriveStatus;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <NewProjectForm userId={userId} from={from} drive={drive} />
    </Dialog>
  );
}

function NewProjectForm({
  userId,
  from,
  drive,
}: {
  userId: string;
  from: string;
  drive: DriveStatus;
}) {
  const router = useRouter();
  const { close } = useDialog();
  const [defaults] = useState(() => readNewTileDefaults(userId));
  const [name, setName] = useState("");
  const [width, setWidth] = useState(String(defaults.width));
  const [height, setHeight] = useState(String(defaults.height));
  const [locked, setLocked] = useState(false);
  const [fill, setFill] = useState<Fill>(
    defaults.background === "white" ? "white" : "transparent",
  );
  const [custom, setCustom] = useState("#f8dde6");
  const [storage, setStorage] = useState<NewTileStorage>(
    defaults.storage === "drive" && !drive.connected
      ? "cloud"
      : defaults.storage,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeOf = (value: string) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= MAX_PIGXEL_SIZE ? n : null;
  };

  const create = async () => {
    const w = sizeOf(width);
    const h = sizeOf(height);
    if (!w || !h)
      return setError(`Use a size from 1 to ${MAX_PIGXEL_SIZE} pixels.`);
    setBusy(true);
    setError(null);
    const result = await createTile({
      userId,
      name: name.trim() || "Untitled",
      width: w,
      height: h,
      background: fill === "transparent" ? "transparent" : "white",
      fill: fill === "custom" ? custom : undefined,
      storage,
    });
    if ("error" in result) {
      setError(result.error);
      setBusy(false);
      return;
    }
    openTabAfter(userId, result.draftId, from);
    router.push(editorUrl(result.draftId));
    close();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
      className="flex min-h-0 flex-col"
    >
      <ModalHeader title="Create New Project" />
      <DialogBody className="grid gap-5 py-5">
        <label className="block">
          <span className={SIZE_LABEL}>Project name</span>
          <Input
            autoFocus
            placeholder="My pixel art"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl px-4"
          />
        </label>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <SizeField
            id="new-w"
            label="Width"
            unit="px"
            value={width}
            onChange={(text) => {
              setWidth(text);
              if (locked) setHeight(text);
            }}
          />
          <button
            type="button"
            aria-pressed={locked}
            aria-label="Keep it square"
            title="Keep it square"
            onClick={() => {
              setLocked(!locked);
              if (!locked) setHeight(width);
            }}
            className={cn(
              "grid size-14 place-items-center rounded-xl border transition-colors",
              locked
                ? "border-primary-soft bg-pastel-pink-soft"
                : "bg-background hover:bg-pink-base",
            )}
          >
            <PixelImage
              src="/art/icons/lock-icon.png"
              alt=""
              width={36}
              height={36}
              className={cn("size-9", !locked && "opacity-50")}
            />
          </button>
          <SizeField
            id="new-h"
            label="Height"
            unit="px"
            value={height}
            onChange={(text) => {
              setHeight(text);
              if (locked) setWidth(text);
            }}
          />
        </div>
        <fieldset>
          <legend className={SIZE_LABEL}>Background</legend>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              aria-pressed={fill === "transparent"}
              onClick={() => setFill("transparent")}
              className={option(fill === "transparent")}
            >
              <span className="size-4 shrink-0 rounded border bg-checker" />
              Transparent
            </button>
            <button
              type="button"
              aria-pressed={fill === "white"}
              onClick={() => setFill("white")}
              className={option(fill === "white")}
            >
              <span className="size-4 shrink-0 rounded border bg-white" />
              White
            </button>
            <label
              className={cn(
                option(fill === "custom"),
                "relative cursor-pointer",
              )}
            >
              <span
                className="size-4 shrink-0 rounded border"
                style={{ backgroundColor: custom }}
              />
              Custom
              <input
                type="color"
                aria-label="Custom background color"
                value={custom}
                onClick={() => setFill("custom")}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setFill("custom");
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend className={SIZE_LABEL}>Where to keep it</legend>
          <div className="grid grid-cols-3 gap-2">
            {STORAGE.map((place) => (
              <button
                key={place.value}
                type="button"
                aria-pressed={storage === place.value}
                disabled={place.value === "drive" && !drive.connected}
                onClick={() => setStorage(place.value)}
                className={option(storage === place.value)}
              >
                {place.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {STORAGE.find((place) => place.value === storage)?.hint}
            {drive.available && !drive.connected && (
              <>
                {" "}
                <a
                  href={connectDriveUrl(editorUrl(from))}
                  className={textLinkClassName}
                >
                  Connect Google Drive
                </a>
              </>
            )}
          </p>
        </fieldset>
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create"}
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
