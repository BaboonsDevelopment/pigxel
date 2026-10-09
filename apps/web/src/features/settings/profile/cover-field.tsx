"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";
import { HERO_IMAGE } from "@/features/profile/components/profile-hero/constants";
import { AVATAR_BUCKET, type ArtistProfile } from "@/features/profile/profile";
import { createClient } from "@/lib/supabase/client";
import { setCover } from "./actions";

const COVER = { w: 1500, h: 253 };
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 1024 * 1024;

async function coverImage(file: File): Promise<{ blob: Blob; ext: string }> {
  const bitmap = await createImageBitmap(file);
  const ratio = COVER.w / COVER.h;
  const cropW = Math.min(bitmap.width, Math.round(bitmap.height * ratio));
  const cropH = Math.min(bitmap.height, Math.round(cropW / ratio));
  const large = cropW >= COVER.w;
  const scale = large
    ? COVER.w / cropW
    : Math.max(1, Math.floor(COVER.w / cropW));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropW * scale);
  canvas.height = Math.round(cropH * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.imageSmoothingEnabled = large;
  ctx.drawImage(
    bitmap,
    (bitmap.width - cropW) / 2,
    (bitmap.height - cropH) / 2,
    cropW,
    cropH,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  bitmap.close();
  const type = large ? "image/webp" : "image/png";
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (out) => (out ? resolve(out) : reject(new Error("no image"))),
      type,
      0.9,
    ),
  );
  return { blob, ext: large ? "webp" : "png" };
}

export function CoverField({
  userId,
  profile,
}: {
  userId: string;
  profile: ArtistProfile;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [coverUrl, showCover] = useOptimistic(profile.coverUrl);

  const remove = () =>
    startTransition(async () => {
      setError(null);
      showCover(null);
      const result = await setCover(null);
      if (result.error) setError(result.error);
    });

  const upload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_FILE_BYTES) {
      setError("Choose a PNG, JPEG or WebP picture under 10 MB.");
      return;
    }
    startTransition(async () => {
      setError(null);
      let image: { blob: Blob; ext: string };
      try {
        image = await coverImage(file);
      } catch {
        setError("This picture couldn’t be read. Try another one.");
        return;
      }
      if (image.blob.size > MAX_UPLOAD_BYTES) {
        setError("This cover is too detailed to upload. Try a simpler one.");
        return;
      }
      const preview = URL.createObjectURL(image.blob);
      showCover(preview);
      const path = `${userId}/cover-${crypto.randomUUID()}.${image.ext}`;
      const storage = createClient().storage.from(AVATAR_BUCKET);
      const { error: uploadError } = await storage.upload(path, image.blob, {
        contentType: image.blob.type,
      });
      if (uploadError) {
        URL.revokeObjectURL(preview);
        setError("Couldn’t upload your cover. Try again.");
        return;
      }
      const result = await setCover(path);
      if (result.error) {
        await storage.remove([path]);
        setError(result.error);
      }
      setTimeout(() => URL.revokeObjectURL(preview), 5000);
    });
  };

  return (
    <div className="mt-4 space-y-3">
      <div
        className={cn(
          "aspect-[1429/241] overflow-hidden rounded-xl border bg-pastel-pink transition-opacity",
          pending && "opacity-70",
        )}
      >
        <PixelImage
          src={coverUrl ?? HERO_IMAGE}
          alt=""
          className="size-full object-cover"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          {pending ? "Saving…" : "Upload cover"}
        </Button>
        {coverUrl && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={remove}
          >
            Use the default cover
          </Button>
        )}
      </div>
      <FormMessage className="text-xs">
        Wide pictures work best, about 6 times wider than tall. Pixel art stays
        crisp.
      </FormMessage>
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
