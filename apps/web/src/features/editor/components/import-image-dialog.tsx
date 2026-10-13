"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { ModalButton } from "@/components/ui/modal-button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { cn } from "@pigxel/ui/lib/utils";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { PixelImage } from "@/components/ui/pixel-image";
import { showSnackbar } from "@/components/ui/snackbar";
import {
  IMAGE_FILE_TYPES,
  isImageFile,
  UNSUPPORTED_FILE,
} from "@/lib/pigxel-file/import-image";

export function ImportImageDialog({
  onImport,
  onClose,
}: {
  onImport: (picture: File) => void;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} size="md" portal>
      <ImportForm onImport={onImport} />
    </Dialog>
  );
}

function ImportForm({ onImport }: { onImport: (picture: File) => void }) {
  const { close } = useDialog();
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const shown = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (shown.current) URL.revokeObjectURL(shown.current);
    },
    [],
  );

  const choose = (next: File | undefined) => {
    if (!next) return;
    if (!isImageFile(next))
      return showSnackbar(UNSUPPORTED_FILE, { tone: "warning" });
    if (shown.current) URL.revokeObjectURL(shown.current);
    shown.current = URL.createObjectURL(next);
    setPicked(next);
    setPreview(shown.current);
  };

  const hold = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <>
      <ModalHeader title="Import Image" />
      <DialogBody className="py-6">
        <div
          onDragEnter={(e) => {
            hold(e);
            setOver(true);
          }}
          onDragOver={(e) => {
            hold(e);
            e.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(e) => {
            hold(e);
            if (!e.currentTarget.contains(e.relatedTarget as Node))
              setOver(false);
          }}
          onDrop={(e) => {
            hold(e);
            setOver(false);
            choose(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            over ? "border-primary bg-pastel-pink-soft" : "border-primary-soft",
          )}
        >
          <button
            type="button"
            aria-label="Choose an image"
            onClick={() => input.current?.click()}
            className="rounded-lg transition-transform hover:scale-105"
          >
            {preview ? (
              <PixelImage
                src={preview}
                alt=""
                className="max-h-24 max-w-40 rounded-md bg-checker object-contain"
              />
            ) : (
              <PixelImage
                src="/art/icons/upload-icon.png"
                alt=""
                width={48}
                height={44}
                className="h-11 w-12"
              />
            )}
          </button>
          <p className="text-base font-semibold">
            {picked ? (
              <span className="break-all">{picked.name}</span>
            ) : (
              <>
                Drop an image here or{" "}
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  browse
                </button>
              </>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            Supported formats: PNG / JPG / GIF
          </p>
          <input
            ref={input}
            type="file"
            accept={IMAGE_FILE_TYPES}
            className="hidden"
            onChange={(e) => {
              choose(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton type="button" variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton
          type="button"
          disabled={!picked}
          onClick={() => {
            if (!picked) return;
            onImport(picked);
            close();
          }}
        >
          Import
        </ModalButton>
      </DialogFooter>
    </>
  );
}
