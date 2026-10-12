"use client";

import { useEffect, useState } from "react";
import { ModalButton } from "@/components/ui/modal-button";
import { CheckboxField } from "@pigxel/ui/components/choice";
import { Dialog, DialogBody, DialogFooter } from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { cn } from "@pigxel/ui/lib/utils";
import { pigxelFileName, PIGXEL_MIME_TYPE } from "@/lib/pigxel-file/format";
import { readCloudTile, readPublishedTile } from "@/lib/pigxel-file/cloud";
import { downloadBlob } from "@/lib/utils/download";
import {
  defaultScale,
  DOWNLOAD_FORMATS,
  downloadPicture,
  downloadScales,
  withBackground,
  type DownloadFormat,
} from "@/features/explore/components/art-page/download";
import {
  toPicture,
  type Picture,
} from "@/features/explore/components/art-page/helpers";
import { showSuccess } from "@/components/ui/snackbar";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";

type ExportFormat = DownloadFormat | "pigxel";

const SECTION = "mb-2 flex justify-between text-xs font-semibold";

const option = (chosen: boolean) =>
  cn(
    "h-10 rounded-xl border text-sm transition-colors",
    chosen
      ? "border-primary-soft bg-pastel-pink-soft font-medium"
      : "border-border bg-background hover:bg-muted",
  );

export function DownloadDialog({
  name,
  file: localFile,
  tileId,
  authorId,
  onDownload,
  withFile = true,
  onClose,
}: {
  name: string;
  file?: string;
  tileId?: string;
  authorId?: string;
  onDownload?: () => void;
  withFile?: boolean;
  onClose: () => void;
}) {
  const [file, setFile] = useState<{ text: string; picture: Picture } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [transparent, setTransparent] = useState(true);

  useEffect(() => {
    let stale = false;
    (localFile !== undefined
      ? Promise.resolve(localFile)
      : authorId
        ? readPublishedTile({ id: tileId ?? "", userId: authorId })
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
  }, [localFile, tileId, authorId]);

  const picture = file?.picture;
  const formats = [
    ...(picture?.animated
      ? DOWNLOAD_FORMATS
      : DOWNLOAD_FORMATS.filter((f) => f.value !== "sheet")),
    ...(withFile
      ? [
          {
            value: "pigxel" as const,
            label: "Pigxel file",
            hint: "Layers and frames, opens in Pigxel",
          },
        ]
      : []),
  ];
  const chosen = formats.find((f) => f.value === format);
  const image = format !== "pigxel";

  const exportFile = () => {
    if (!file || scale === null) return;
    if (format === "pigxel")
      downloadBlob(
        new Blob([file.text], { type: PIGXEL_MIME_TYPE }),
        pigxelFileName(name),
      );
    else
      downloadPicture(
        transparent
          ? file.picture
          : withBackground(file.picture, file.picture.background ?? "#ffffff"),
        name,
        format,
        scale,
      );
    onDownload?.();
    showSuccess("Download complete!");
    onClose();
  };

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <ModalHeader title="Download Project" />
      <DialogBody className="grid gap-5 py-5">
        {error ? (
          <FormMessage tone="error">{error}</FormMessage>
        ) : !picture || scale === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : (
          <>
            <div>
              <p className={SECTION}>Format</p>
              <div
                role="radiogroup"
                aria-label="Format"
                className="grid grid-cols-3 gap-2"
              >
                {formats.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    role="radio"
                    aria-checked={f.value === format}
                    onClick={() => setFormat(f.value)}
                    className={option(f.value === format)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {chosen && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {chosen.value === "png" && picture.animated
                    ? "First frame"
                    : chosen.hint}
                </p>
              )}
            </div>
            {image && (
              <div>
                <p className={SECTION}>
                  Scale
                  <span className="font-normal text-muted-foreground tabular-nums">
                    {picture.width * scale} × {picture.height * scale} px
                  </span>
                </p>
                <div
                  role="radiogroup"
                  aria-label="Scale"
                  className="grid grid-cols-3 gap-2"
                >
                  {downloadScales(picture.width, picture.height).map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={s === scale}
                      onClick={() => setScale(s)}
                      className={cn(option(s === scale), "tabular-nums")}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            )}
            {image && (
              <CheckboxField
                label="Transparent background"
                checked={transparent}
                onChange={(e) => setTransparent(e.target.checked)}
              />
            )}
          </>
        )}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton type="button" variant="secondary" onClick={onClose}>
          Cancel
        </ModalButton>
        <ModalButton type="button" disabled={!file} onClick={exportFile}>
          Download
        </ModalButton>
      </DialogFooter>
    </Dialog>
  );
}
