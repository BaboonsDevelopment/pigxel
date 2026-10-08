"use client";

import { useEffect, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { cn } from "@pigxel/ui/lib/utils";
import { pigxelFileName, PIGXEL_MIME_TYPE } from "@/lib/pigxel-file/format";
import { readCloudTile } from "@/lib/pigxel-file/cloud";
import { downloadBlob } from "@/lib/utils/download";
import {
  defaultScale,
  DOWNLOAD_FORMATS,
  downloadPicture,
  downloadScales,
} from "@/features/explore/components/art-page/download";
import {
  toPicture,
  type Picture,
} from "@/features/explore/components/art-page/helpers";

const OPTION =
  "flex w-full cursor-pointer items-baseline justify-between gap-4 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary disabled:cursor-default disabled:opacity-50";

export function DownloadDialog({
  name,
  file: localFile,
  tileId,
  onClose,
}: {
  name: string;
  file?: string;
  tileId?: string;
  onClose: () => void;
}) {
  const [file, setFile] = useState<{ text: string; picture: Picture } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    let stale = false;
    (localFile !== undefined
      ? Promise.resolve(localFile)
      : readCloudTile(tileId ?? "")
    )
      .then((text) => {
        if (stale) return;
        const picture = toPicture(text);
        setFile({ text, picture });
        setScale(defaultScale(picture.width, picture.height));
      })
      .catch(() => {
        if (!stale) setError("Couldn’t open this project. Try again.");
      });
    return () => {
      stale = true;
    };
  }, [localFile, tileId]);

  const picture = file?.picture;
  const formats = picture?.animated
    ? DOWNLOAD_FORMATS
    : DOWNLOAD_FORMATS.filter((format) => format.value !== "sheet");

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <DialogHeader
        title="Download"
        description={`Save “${name}” as an image, or as a Pigxel file to open later.`}
      />
      <DialogBody className="grid gap-4">
        {error ? (
          <FormMessage tone="error">{error}</FormMessage>
        ) : !picture || scale === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : (
          <>
            <div>
              <span className="mb-1.5 flex justify-between text-xs font-medium">
                Scale
                <span className="font-normal text-muted-foreground tabular-nums">
                  {picture.width * scale} × {picture.height * scale} px
                </span>
              </span>
              <span role="group" aria-label="Scale" className="flex gap-1">
                {downloadScales(picture.width, picture.height).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={option === scale}
                    onClick={() => setScale(option)}
                    className={cn(
                      "h-7 flex-1 cursor-pointer rounded-md border text-xs tabular-nums transition-colors hover:bg-muted",
                      option === scale &&
                        "border-transparent bg-pastel-pink hover:bg-pastel-pink",
                    )}
                  >
                    {option}×
                  </button>
                ))}
              </span>
            </div>
            <ul className="-mx-1 grid gap-0.5 border-t pt-3">
              {formats.map((format) => (
                <li key={format.value}>
                  <button
                    type="button"
                    onClick={() =>
                      downloadPicture(picture, name, format.value, scale)
                    }
                    className={OPTION}
                  >
                    <span className="font-medium">{format.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {format.value === "png" && picture.animated
                        ? "First frame"
                        : format.hint}
                    </span>
                  </button>
                </li>
              ))}
              <li className="mt-1 border-t pt-1">
                <button
                  type="button"
                  onClick={() =>
                    downloadBlob(
                      new Blob([file.text], { type: PIGXEL_MIME_TYPE }),
                      pigxelFileName(name),
                    )
                  }
                  className={OPTION}
                >
                  <span className="font-medium">Pigxel file</span>
                  <span className="text-xs text-muted-foreground">
                    Layers and frames, opens in Pigxel
                  </span>
                </button>
              </li>
            </ul>
          </>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
