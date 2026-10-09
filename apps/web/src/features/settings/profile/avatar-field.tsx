"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { cn } from "@pigxel/ui/lib/utils";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { AVATAR_BUCKET, type ArtistProfile } from "@/features/profile/profile";
import { createClient } from "@/lib/supabase/client";
import { setAvatar } from "./actions";
import { AvatarCropDialog } from "./avatar-crop/avatar-crop-dialog";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function AvatarField({
  userId,
  profile,
}: {
  userId: string;
  profile: ArtistProfile;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [avatarUrl, showAvatar] = useOptimistic(profile.avatarUrl);
  const [cropping, setCropping] = useState<File | null>(null);

  const choose = (kind: "none" | "provider") =>
    startTransition(async () => {
      setError(null);
      showAvatar(kind === "provider" ? profile.providerAvatarUrl : null);
      const result = await setAvatar(kind);
      if (result.error) setError(result.error);
    });

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_FILE_BYTES) {
      setError("Choose a PNG, JPEG or WebP picture under 10 MB.");
      return;
    }
    setError(null);
    setCropping(file);
  };

  const upload = (png: Blob) => {
    setCropping(null);
    startTransition(async () => {
      setError(null);
      const preview = URL.createObjectURL(png);
      showAvatar(preview);
      const path = `${userId}/${crypto.randomUUID()}.png`;
      const storage = createClient().storage.from(AVATAR_BUCKET);
      const { error: uploadError } = await storage.upload(path, png, {
        contentType: "image/png",
      });
      if (uploadError) {
        URL.revokeObjectURL(preview);
        setError("Couldn’t upload your picture. Try again.");
        return;
      }
      const result = await setAvatar("upload", path);
      if (result.error) {
        await storage.remove([path]);
        setError(result.error);
      }
      setTimeout(() => URL.revokeObjectURL(preview), 5000);
    });
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-5">
      <ProfileAvatar
        name={profile.name}
        url={avatarUrl}
        className={cn("size-20 text-2xl", pending && "opacity-70")}
      />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => input.current?.click()}
          >
            {pending ? "Saving…" : "Upload picture"}
          </Button>
          {profile.providerAvatarUrl &&
            avatarUrl !== profile.providerAvatarUrl && (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => choose("provider")}
              >
                Use Google photo
              </Button>
            )}
          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => choose("none")}
            >
              Remove
            </Button>
          )}
        </div>
        <FormMessage className="text-xs">
          Square pictures work best. Pixel art stays crisp.
        </FormMessage>
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {cropping && (
        <AvatarCropDialog
          file={cropping}
          onCrop={upload}
          onClose={() => setCropping(null)}
        />
      )}
    </div>
  );
}
