import { ImageResponse } from "next/og";
import { findProfile } from "@/features/profile/server";
import { usernameError, usernameIn } from "@/features/profile/validation";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Artist profile on Pigxel";

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const username = usernameIn((await params).username);
  const lookup = usernameError(username)
    ? null
    : await findProfile(username).catch(() => null);
  if (lookup?.kind !== "found")
    return new Response("Not found", { status: 404 });
  const { profile } = lookup;
  const bio = profile.bio.trim().replace(/\s+/g, " ");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 56,
        padding: "0 90px",
        background: "linear-gradient(120deg, #efe4fb, #f6e6f3 45%, #fbe3ea)",
        color: "#4a2434",
        fontFamily: "sans-serif",
      }}
    >
      {profile.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt=""
          width={260}
          height={260}
          style={{
            borderRadius: 999,
            border: "10px solid #ffffff",
            objectFit: "cover",
            imageRendering: "pixelated",
          }}
        />
      ) : (
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: 999,
            border: "10px solid #ffffff",
            background: "#e9c2d2",
            color: "#8a3d5c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 120,
            fontWeight: 700,
          }}
        >
          {profile.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>
          {profile.name.slice(0, 40)}
        </div>
        <div style={{ fontSize: 34, color: "#8b7a84", marginTop: 12 }}>
          @{profile.username}
        </div>
        {bio && (
          <div
            style={{
              fontSize: 32,
              lineHeight: 1.35,
              marginTop: 28,
              maxHeight: 130,
              overflow: "hidden",
            }}
          >
            {bio.length > 140 ? `${bio.slice(0, 139)}…` : bio}
          </div>
        )}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#c65a7e",
            marginTop: 40,
          }}
        >
          Pigxel
        </div>
      </div>
    </div>,
    { ...size, headers: { "cache-control": "public, max-age=3600" } },
  );
}
