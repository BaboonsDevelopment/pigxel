"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@pigxel/ui/components/dialog";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { NumericInput } from "../../components/numeric-input";
import {
  addFontFace,
  detectPixelSize,
  rememberCustomFont,
} from "../../pixel-canvas/custom-fonts";
import { textPiece } from "../../pixel-canvas/text";
import {
  customFontId,
  type CustomFont,
  type TextFont,
} from "../../pixel-canvas/text-fonts";
import {
  deleteFont,
  FONT_TYPES,
  FONTS_KEY,
  fontExtension,
  MAX_FONT_BYTES,
  uploadFont,
  useCustomFonts,
  type SavedFont,
} from "./fonts";

const SAMPLE = "The quick brown fox\njumps over 0123456789";
const UNREADABLE =
  "Pigxel can’t read this file. Use a .ttf, .otf, .woff or .woff2 font.";

type Pending = {
  file: File;
  id: CustomFont;
  family: string;
  name: string;
  px: number;
};

export function FontsDialog({
  current,
  onPick,
  onClose,
}: {
  current: TextFont;
  onPick: (font: TextFont) => void;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const fonts = useCustomFonts();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [uploading, setUploading] = useState<CustomFont[]>([]);
  const [error, setError] = useState<string | null>(null);

  const setFonts = (update: (fonts: SavedFont[]) => SavedFont[]) =>
    client.setQueryData<SavedFont[]>(FONTS_KEY, (old) => update(old ?? []));

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!FONT_TYPES[fontExtension(file.name)]) return setError(UNREADABLE);
    if (file.size > MAX_FONT_BYTES)
      return setError("This font is over 2 MB. Pixel fonts are much smaller.");
    const id = customFontId(crypto.randomUUID());
    try {
      const family = await addFontFace(id, await file.arrayBuffer());
      setPending({
        file,
        id,
        family,
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 60),
        px: detectPixelSize(family),
      });
    } catch {
      setError(UNREADABLE);
    }
  };

  const save = (font: Pending) => {
    const saved: SavedFont = {
      id: font.id,
      name: font.name.trim(),
      px: font.px,
    };
    rememberCustomFont(font.id, { family: font.family, px: font.px });
    setFonts((list) => [...list, saved]);
    setUploading((ids) => [...ids, font.id]);
    setPending(null);
    onPick(font.id);
    void uploadFont(saved, font.file).then((message) => {
      setUploading((ids) => ids.filter((id) => id !== font.id));
      if (!message) return;
      setFonts((list) => list.filter((f) => f.id !== font.id));
      setError(message);
    });
  };

  const remove = (font: SavedFont) => {
    setError(null);
    setFonts((list) => list.filter((f) => f.id !== font.id));
    if (current === font.id) onPick("tiny5");
    void deleteFont(font.id).then((done) => {
      if (done) return;
      void client.invalidateQueries({ queryKey: FONTS_KEY });
      setError("Couldn’t delete the font. Try again.");
    });
  };

  return (
    <Dialog onClose={onClose} size="md" portal>
      <DialogHeader
        title={pending ? "Add a font" : "Your fonts"}
        description={
          pending
            ? "Set the size the font was drawn at, so every pixel lands on the grid. The preview shows it at 1×."
            : "Upload a pixel font to write with it on any tile. Fonts stay with your account."
        }
      />
      <DialogBody className="grid gap-4">
        {pending ? (
          <>
            <Field label="Name" htmlFor="font-name">
              <Input
                id="font-name"
                value={pending.name}
                maxLength={60}
                onChange={(e) =>
                  setPending({ ...pending, name: e.target.value })
                }
              />
            </Field>
            <Field
              label="Pixel size"
              htmlFor="font-px"
              hint="Found by looking at the font. Change it if the letters look blurry or broken."
            >
              <NumericInput
                as={Input}
                id="font-px"
                min={4}
                max={64}
                value={pending.px}
                onValueChange={(px) =>
                  setPending({
                    ...pending,
                    px: Math.min(64, Math.max(4, Math.round(px))),
                  })
                }
                className="w-24"
              />
            </Field>
            <FontPreview font={pending} />
          </>
        ) : fonts.isPending ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : fonts.isError ? (
          <FormMessage tone="error">{fonts.error.message}</FormMessage>
        ) : fonts.data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No fonts yet.
          </p>
        ) : (
          <ul className="-mx-2 grid gap-0.5">
            {fonts.data.map((font) => (
              <li
                key={font.id}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-secondary"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {font.name}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {uploading.includes(font.id) ? "Uploading…" : `${font.px} px`}
                </span>
                <IconButton
                  label={`Delete ${font.name}`}
                  disabled={uploading.includes(font.id)}
                  onClick={() => remove(font)}
                >
                  ×
                </IconButton>
              </li>
            ))}
          </ul>
        )}
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <input
          ref={input}
          type="file"
          hidden
          accept=".ttf,.otf,.woff,.woff2"
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </DialogBody>
      <DialogFooter>
        {pending ? (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPending(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!pending.name.trim()}
              onClick={() => save(pending)}
            >
              Add font
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button type="button" onClick={() => input.current?.click()}>
              Upload font…
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}

function FontPreview({ font }: { font: Pending }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let live = true;
    rememberCustomFont(font.id, { family: font.family, px: font.px });
    void textPiece(SAMPLE, font.id, 1, [0, 0, 0, 255], 0, 0).then((piece) => {
      const target = canvas.current;
      if (!live || !target) return;
      setEmpty(!piece);
      if (!piece) return;
      target.width = piece.w;
      target.height = piece.h;
      target.style.width = `${piece.w * 2}px`;
      target
        .getContext("2d")
        ?.putImageData(
          new ImageData(
            piece.pixels as Uint8ClampedArray<ArrayBuffer>,
            piece.w,
            piece.h,
          ),
          0,
          0,
        );
    });
    return () => {
      live = false;
    };
  }, [font.id, font.family, font.px]);

  return (
    <div className="grid min-h-24 place-items-center overflow-auto rounded-lg border bg-white p-3">
      {empty && (
        <p className="text-sm text-muted-foreground">
          This font has none of these letters.
        </p>
      )}
      <canvas
        ref={canvas}
        hidden={empty}
        aria-label="Font preview"
        className="max-w-full [image-rendering:pixelated]"
      />
    </div>
  );
}
