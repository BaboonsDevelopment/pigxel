"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormMessage } from "@pigxel/ui/components/field";
import { Heading } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { draftFromFile, editorUrl } from "@/lib/pigxel-file/open-tile";
import { setFollowing } from "@/features/profile/actions";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import type { PublicTile } from "@/features/profile/profile";
import { ProjectMenu } from "@/features/tiles/components/project-card/components/project-menu";
import { manrope } from "@/lib/fonts/manrope";
import { formatCount } from "../../popular-card/helpers";
import { recordDownload, setTileLiked, setTileSaved } from "../../../actions";
import { downloadPicture, type DownloadFormat } from "../download";
import { DownloadMenu } from "./download-menu";
import type { Picture } from "../helpers";
import { EditDetailsDialog } from "./edit-details-dialog";

export function ArtDetails({
  tile,
  viewerId,
  following,
  saved,
  file,
  picture,
  palette,
}: {
  tile: PublicTile;
  viewerId: string | null;
  following: boolean;
  saved: boolean;
  file: string | null;
  picture: Picture | null;
  palette: string[];
}) {
  const { author } = tile;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [remixing, setRemixing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [follows, setFollows] = useState(following);
  const [followPending, startFollow] = useTransition();
  const [downloads, setDownloads] = useState(tile.downloads);
  const [like, setLike] = useState({ liked: tile.liked, count: tile.likes });
  const [likePending, startLike] = useTransition();
  const [isSaved, setIsSaved] = useState(saved);
  const [savePending, startSave] = useTransition();
  const own = viewerId === author.id;
  const [details, setDetails] = useState({
    tags: tile.tags,
    description: tile.description,
    allowRemix: tile.allowRemix ?? true,
  });
  const canRemix = own || details.allowRemix;
  const [editing, setEditing] = useState(false);

  const download = async (format: DownloadFormat, scale: number) => {
    if (!picture) return;
    downloadPicture(picture, tile.name, format, scale);
    const counted = await recordDownload(tile.id);
    if (counted !== null) setDownloads(counted);
  };

  const toggleLike = () => {
    if (!viewerId) return router.push("/login");
    startLike(async () => {
      const before = like;
      const next = !before.liked;
      setLike({ liked: next, count: before.count + (next ? 1 : -1) });
      const result = await setTileLiked(tile.id, next);
      if (result.error) {
        setLike(before);
        setError(result.error);
      }
    });
  };

  const toggleSave = () => {
    if (!viewerId) return router.push("/login");
    startSave(async () => {
      const next = !isSaved;
      setIsSaved(next);
      const result = await setTileSaved(tile.id, next);
      if (result.error) {
        setIsSaved(!next);
        setError(result.error);
      }
    });
  };

  const remix = async () => {
    if (!viewerId) return router.push("/login");
    if (!file) return;
    setRemixing(true);
    setError(null);
    try {
      const id = await draftFromFile(viewerId, file, tile.name, null);
      router.push(editorUrl(id));
    } catch {
      setError("Couldn’t open this art in the editor. Try again.");
      setRemixing(false);
    }
  };

  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share)
      await navigator.share({ title: tile.name, url }).catch(() => {});
    else copy(url, "link");
  };

  const toggleFollow = () => {
    if (!viewerId) return router.push("/login");
    startFollow(async () => {
      const next = !follows;
      setFollows(next);
      const result = await setFollowing(author.id, next);
      if (result.error) {
        setFollows(!next);
        setError(result.error);
      }
    });
  };

  return (
    <section
      aria-labelledby="art-title"
      className={cn(
        manrope.className,
        "flex flex-col rounded-2xl border bg-background px-5 py-4 text-[#4a1f35] [&>*]:shrink-0 shadow-[0_1px_2px_rgb(59_42_51/0.06)] lg:min-h-0 lg:overflow-y-auto",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <ul aria-label="Tags" className="flex flex-wrap gap-2">
          {details.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-md bg-pastel-pink-soft px-2 py-0.5 text-[10px] text-primary"
            >
              {tag}
            </li>
          ))}
        </ul>
        <ProjectMenu
          label={`More for ${tile.name}`}
          icon={
            <svg aria-hidden="true" viewBox="0 0 20 4" className="w-4">
              <circle cx="2" cy="2" r="2" fill="currentColor" />
              <circle cx="10" cy="2" r="2" fill="currentColor" />
              <circle cx="18" cy="2" r="2" fill="currentColor" />
            </svg>
          }
          placement="down"
          items={[
            ...(own
              ? [{ label: "Edit details", onSelect: () => setEditing(true) }]
              : []),
            {
              label: "Copy link",
              onSelect: () => copy(window.location.href, "link"),
            },
            {
              label: "View profile",
              onSelect: () => router.push(`/u/${author.username}`),
            },
          ]}
        />
      </div>
      {editing && (
        <EditDetailsDialog
          tileId={tile.id}
          name={tile.name}
          tags={details.tags}
          description={details.description}
          allowRemix={details.allowRemix}
          onSaved={setDetails}
          onClose={() => setEditing(false)}
        />
      )}

      <Heading
        as="h1"
        id="art-title"
        className="mt-3 text-[34px] leading-[1.1] font-bold text-[#4a1f35]"
      >
        {tile.name}
      </Heading>

      <div className="mt-3 flex items-center gap-3">
        <Link
          href={`/u/${author.username}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <ProfileAvatar
            name={author.name}
            url={author.avatarUrl}
            className="size-8 bg-pastel-pink-soft text-sm text-primary"
          />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">
              {author.name}
            </span>
            <span className="block truncate text-[10px] text-muted-foreground">
              @{author.username}
            </span>
            {author.bio?.trim() && (
              <span
                title={author.bio}
                className="mt-0.5 block truncate text-[11px] text-muted-foreground"
              >
                {author.bio.trim()}
              </span>
            )}
          </span>
        </Link>
        {!own && (
          <button
            type="button"
            aria-pressed={follows}
            disabled={followPending}
            onClick={toggleFollow}
            className="h-7 shrink-0 cursor-pointer rounded-lg border border-primary-soft bg-pastel-pink-soft px-3 text-[11px] text-primary transition-colors hover:bg-pastel-pink aria-pressed:border-border aria-pressed:bg-background aria-pressed:text-muted-foreground"
          >
            {follows ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {details.description && (
        <p className="mt-3 text-xs leading-relaxed break-words whitespace-pre-line text-muted-foreground">
          {details.description}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 rounded-xl border border-[#f6dbe4] bg-[#fef6f8] py-2">
        <button
          type="button"
          aria-pressed={like.liked}
          aria-label={like.liked ? "Unlike" : "Like"}
          disabled={likePending}
          onClick={toggleLike}
          className={cn(
            "flex cursor-pointer items-center gap-3 border-r border-[#f6dbe4] px-4 text-left transition-colors hover:text-primary",
            like.liked && "text-primary",
          )}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill={like.liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            className="size-5"
          >
            <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />
          </svg>
          <div>
            <p className="text-sm font-semibold tabular-nums">
              {formatCount(like.count)}
            </p>
            <p className="text-[10px] text-muted-foreground">likes</p>
          </div>
        </button>
        <div className="flex items-center justify-end gap-3 px-4">
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
          >
            <path d="M8 2v8.5M4.5 7 8 10.5 11.5 7M2 10.5V12a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 14 12v-1.5" />
          </svg>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {formatCount(downloads)}
            </p>
            <p className="text-[10px] text-muted-foreground">downloads</p>
          </div>
        </div>
      </div>

      {canRemix ? (
        <>
          <button
            type="button"
            disabled={remixing || (!!viewerId && !file)}
            onClick={() => void remix()}
            className="relative mt-4 flex h-10 w-full cursor-pointer items-center justify-center rounded-xl bg-[#d9558a] text-[13px] font-medium text-white shadow-[0_8px_18px_-10px_#d9558a] transition-colors hover:bg-[#c94a7d] disabled:cursor-default disabled:opacity-60"
          >
            {remixing ? "Opening…" : "Open & remix in editor"}
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute right-4 size-4"
            >
              <path d="M4 12 12 4M6 4h6v6" />
            </svg>
          </button>
          <p className="mt-2 text-center text-[10px] leading-snug text-muted-foreground">
            Make it your own. A copy will be added to My projects, with credit
            to {author.username}.
          </p>
        </>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed px-3 py-2.5 text-center text-[11px] text-muted-foreground">
          {author.username} turned off remixing for this art.
        </p>
      )}
      {error && (
        <FormMessage tone="error" className="mt-2 text-center">
          {error}
        </FormMessage>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-3">
        <DownloadMenu
          width={tile.width}
          height={tile.height}
          animated={!!picture?.animated}
          disabled={!picture}
          onDownload={(format, scale) => void download(format, scale)}
        />
        <button
          type="button"
          aria-pressed={isSaved}
          disabled={savePending}
          onClick={toggleSave}
          className={cn(
            "flex h-8 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-xs transition-colors hover:bg-muted",
            isSaved && "border-primary-soft bg-pastel-pink-soft text-primary",
          )}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill={isSaved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="M4 2.5h8v11L8 10.5l-4 3Z" />
          </svg>
          {isSaved ? "Saved" : "Save project"}
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-xs transition-colors hover:bg-muted"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            className="size-4"
          >
            <circle cx="12" cy="3.5" r="1.8" />
            <circle cx="4" cy="8" r="1.8" />
            <circle cx="12" cy="12.5" r="1.8" />
            <path d="m5.6 7.1 4.8-2.7M5.6 8.9l4.8 2.7" />
          </svg>
          {copied === "link" ? "Link copied" : "Share"}
        </button>
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <Heading as="h2" className="text-base font-bold text-[#4a1f35]">
            Little colors, big mood
          </Heading>
          {palette.length > 0 ? (
            <Link
              href={`/tiles/new?${new URLSearchParams({
                colors: palette.map((color) => color.slice(1)).join(","),
                paletteName: `From “${tile.name}”`,
              })}`}
              className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-primary-soft bg-pastel-pink-soft px-2.5 text-[11px] text-primary transition-colors hover:bg-pastel-pink"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
                className="size-3.5"
              >
                <path d="M8 1.5a6.5 6.5 0 1 0 0 13c1 0 1.5-.6 1.5-1.3 0-.9-.8-1.2-.8-2s.6-1.2 1.4-1.2h1.6a2.8 2.8 0 0 0 2.8-2.8C14.5 4 11.6 1.5 8 1.5Z" />
                <circle cx="4.8" cy="7" r=".8" />
                <circle cx="7" cy="4.5" r=".8" />
                <circle cx="10.2" cy="5" r=".8" />
              </svg>
              Use this palette
            </Link>
          ) : null}
        </div>
        <ul className="mt-2.5 grid grid-cols-7 gap-2">
          {palette.map((color) => (
            <li key={color}>
              <button
                type="button"
                title={copied === color ? "Copied" : color}
                aria-label={`Copy ${color}`}
                onClick={() => copy(color, color)}
                className={cn(
                  "block h-6 w-full cursor-pointer rounded-md border border-black/5 transition-transform hover:-translate-y-0.5",
                  copied === color && "ring-2 ring-primary",
                )}
                style={{ background: color }}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-start gap-3 border-t pt-4">
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="mt-0.5 size-4 shrink-0"
        >
          <circle cx="8" cy="8" r="6.2" />
          <path d="M1.8 8h12.4M8 1.8c1.8 1.8 2.6 3.9 2.6 6.2S9.8 12.4 8 14.2C6.2 12.4 5.4 10.3 5.4 8S6.2 3.6 8 1.8Z" />
        </svg>
        <div>
          <p className="text-[11px]">
            Public project · Remix {details.allowRemix ? "enabled" : "disabled"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Original creation by {author.username}
          </p>
        </div>
      </div>
    </section>
  );
}
