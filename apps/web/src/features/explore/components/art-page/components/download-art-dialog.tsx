"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogBody } from "@pigxel/ui/components/dialog";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { ModalHeader } from "@/components/ui/modal-header";
import { PixelImage } from "@/components/ui/pixel-image";
import { showSuccess } from "@/components/ui/snackbar";
import { encodePng } from "@/features/editor/export/apng";
import { pigxelFileName, PIGXEL_MIME_TYPE } from "@/lib/pigxel-file/format";
import { downloadBlob } from "@/lib/utils/download";
import { defaultScale, downloadPicture, downloadScales } from "../download";
import type { Picture } from "../helpers";

type Choice = "png" | "png2" | "gif" | "pigxel";

const LABELS: Record<Choice, string> = {
  png: "Download PNG",
  png2: "Download PNG",
  gif: "Download GIF",
  pigxel: "Download source",
};

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DownloadArtDialog({
  name,
  author,
  thumbnail,
  picture,
  file,
  withFile,
  onDownload,
  onClose,
}: {
  name: string;
  author: string;
  thumbnail: string | null;
  picture: Picture;
  file: string | null;
  withFile: boolean;
  onDownload: () => void;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState<Choice>("png");
  const { width: w, height: h } = picture;
  const twice = downloadScales(w, h).includes(2);
  const gifScale = defaultScale(w, h);
  const pngSize = useMemo(
    () => encodePng(picture.frames[0]!.pixels.data, w, h).byteLength,
    [picture, w, h],
  );

  const options: { value: Choice; title: string; hint: string }[] = [
    {
      value: "png",
      title: "PNG image",
      hint: `Original · ${w} × ${h} px · ${sizeLabel(pngSize)}`,
    },
    ...(twice
      ? [
          {
            value: "png2" as const,
            title: "PNG image · 2×",
            hint: `Crisp pixels · ${w * 2} × ${h * 2} px`,
          },
        ]
      : []),
    ...(picture.animated
      ? [
          {
            value: "gif" as const,
            title: "GIF animation",
            hint: `All frames · ${w * gifScale} × ${h * gifScale} px`,
          },
        ]
      : []),
    ...(withFile && file !== null
      ? [
          {
            value: "pigxel" as const,
            title: "Pigxel source",
            hint: "Editable layers · .pigxel",
          },
        ]
      : []),
  ];

  const download = () => {
    if (choice === "pigxel") {
      if (file === null) return;
      downloadBlob(
        new Blob([file], { type: PIGXEL_MIME_TYPE }),
        pigxelFileName(name),
      );
    } else if (choice === "gif")
      downloadPicture(picture, name, "gif", gifScale);
    else downloadPicture(picture, name, "png", choice === "png2" ? 2 : 1);
    onDownload();
    showSuccess("Download complete!");
    onClose();
  };

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <ModalHeader title="Download artwork" />
      <DialogBody className="grid gap-4 py-5">
        <div className="flex items-center gap-3">
          <span className="size-12 shrink-0 overflow-hidden rounded-lg border bg-checker">
            {thumbnail && (
              <PixelImage
                src={thumbnail}
                alt=""
                className="size-full object-cover"
              />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              by {author}
            </span>
          </span>
        </div>
        <div role="radiogroup" aria-label="Format" className="grid gap-2">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={o.value === choice}
              onClick={() => setChoice(o.value)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                o.value === choice
                  ? "border-primary-soft bg-pastel-pink-soft"
                  : "bg-background hover:bg-muted",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                  o.value === choice
                    ? "border-primary"
                    : "border-muted-foreground",
                )}
              >
                {o.value === choice && (
                  <span className="size-1.5 rounded-full bg-primary" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{o.title}</span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  {o.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          A little credit goes a long way. Please mention @{author} when
          sharing.
        </p>
        <ModalButton type="button" onClick={download} className="w-full">
          {LABELS[choice]}
        </ModalButton>
      </DialogBody>
    </Dialog>
  );
}
