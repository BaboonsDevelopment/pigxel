"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { FormMessage } from "@pigxel/ui/components/field";
import { cn } from "@pigxel/ui/lib/utils";
import { CloudError } from "@/lib/pigxel-file/cloud";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { remixArt } from "../../../remix";
import { setFollowing } from "@/features/profile/actions";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import type { PublicTile } from "@/features/profile/profile";
import { ProjectMenu } from "@/features/tiles/components/project-card/components/project-menu";
import { madimiOne } from "@/lib/fonts/madimi";
import { formatCount } from "../../popular-card/helpers";
import {
  recordDownload,
  recordView,
  reportArt,
  setTileLiked,
  setTileSaved,
} from "../../../actions";
import type { Picture } from "../helpers";
import { DownloadArtDialog } from "./download-art-dialog";
import { EditDetailsDialog } from "./edit-details-dialog";
import { ReportDialog } from "./report-dialog";
import type { ReportReason } from "../../../constants";
import {
  LINK_COPIED,
  showSnackbar,
  showSuccess,
  showUndo,
} from "@/components/ui/snackbar";
import { CollectButton } from "@/features/collections/components/collect-button";
import { projectKeys } from "@/features/tiles/queries/keys";

const counting = new Set<string>();

const ACTION =
  "h-9 cursor-pointer rounded-xl border bg-background text-xs font-medium transition-colors hover:bg-muted disabled:cursor-default disabled:bg-muted disabled:text-muted-foreground";

const published = new Intl.DateTimeFormat("en", { dateStyle: "long" });

function Stat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#4a1f35] [&>svg]:size-[18px]">{icon}</span>
      <span>
        <span className="block text-[13px] leading-tight font-semibold tabular-nums">
          {formatCount(value)}
        </span>
        <span className="block text-[10px] leading-tight text-muted-foreground">
          {label}
        </span>
      </span>
    </div>
  );
}

function Svg({
  children,
  fill = "none",
}: {
  children: ReactNode;
  fill?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill={fill}
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      {children}
    </svg>
  );
}

const HEART =
  "M8 13.5S2.5 10.3 2.5 6.4A3 3 0 0 1 8 4.8a3 3 0 0 1 5.5 1.6c0 3.9-5.5 7.1-5.5 7.1Z";

const RemixIcon = () => (
  <Svg>
    <circle cx="4.5" cy="3.5" r="1.5" />
    <circle cx="11.5" cy="3.5" r="1.5" />
    <circle cx="8" cy="12.5" r="1.5" />
    <path d="M4.5 5v1.5a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V5M8 8.5V11" />
  </Svg>
);

export function ArtDetails({
  tile,
  viewerId,
  following,
  saved,
  file,
  picture,
  commentCount,
}: {
  tile: PublicTile;
  viewerId: string | null;
  following: boolean;
  saved: boolean;
  file: string | null;
  picture: Picture | null;
  commentCount: number;
}) {
  const { author } = tile;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [remixing, setRemixing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [follows, setFollows] = useState(following);
  const [followPending, startFollow] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const [views, setViews] = useState(tile.views ?? 0);

  useEffect(() => {
    const key = `pigxel:viewed:${tile.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {}
    if (counting.has(tile.id)) return;
    counting.add(tile.id);
    void recordView(tile.id)
      .then((count) => {
        if (count === null) return;
        setViews(count);
        try {
          sessionStorage.setItem(key, "1");
        } catch {}
      })
      .finally(() => counting.delete(tile.id));
  }, [tile.id]);
  const [like, setLike] = useState({ liked: tile.liked, count: tile.likes });
  const [likePending, startLike] = useTransition();
  const [isSaved, setIsSaved] = useState(saved);
  const [savePending, startSave] = useTransition();
  const client = useQueryClient();
  const collect = useRef<{ open: () => void }>(null);
  const own = viewerId === author.id;
  const [details, setDetails] = useState({
    tags: tile.tags,
    description: tile.description,
    allowRemix: tile.allowRemix ?? true,
    name: tile.name,
  });
  const canRemix = own || details.allowRemix;
  const [editing, setEditing] = useState(false);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);

  const report = async (reason: ReportReason, details: string) => {
    const result = await reportArt(tile.id, reason, details);
    if (result.error) return result.error;
    setReported(true);
    showSuccess("Thanks, we’ll take a look.");
    return null;
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

  const saveAs = (next: boolean) =>
    startSave(async () => {
      setIsSaved(next);
      const result = await setTileSaved(tile.id, next);
      void client.invalidateQueries({ queryKey: projectKeys.savedAll() });
      if (result.error) {
        setIsSaved(!next);
        setError(result.error);
      } else if (next) showSuccess("Added to favorites");
      else showUndo("Removed from favorites.", () => saveAs(true));
    });

  const toggleSave = () => {
    if (!viewerId)
      return showSnackbar("Log in to save your project.", {
        tone: "account",
        action: { label: "Log in", onClick: () => router.push("/login") },
      });
    saveAs(!isSaved);
  };

  const remix = async () => {
    if (!viewerId) return router.push("/login");
    if (!file) return;
    setRemixing(true);
    setError(null);
    try {
      router.push(editorUrl(await remixArt(viewerId, tile, file)));
    } catch (e) {
      setError(
        e instanceof CloudError
          ? e.message
          : "Couldn’t open this art in the editor. Try again.",
      );
      setRemixing(false);
    }
  };

  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      if (label === "link") showSnackbar(LINK_COPIED, { tone: "action" });
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
    <section aria-labelledby="art-title" className="flex flex-col">
      <div className="flex items-center gap-3">
        <Link
          href={`/u/${author.username}`}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
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
            <span
              title={author.bio?.trim() || undefined}
              className="block truncate text-[10px] text-muted-foreground"
            >
              {author.bio?.trim() || `@${author.username}`}
            </span>
          </span>
        </Link>
        {!own && (
          <button
            type="button"
            aria-pressed={follows}
            disabled={followPending}
            onClick={toggleFollow}
            className="h-7 shrink-0 cursor-pointer rounded-lg border bg-background px-5 text-xs transition-colors hover:bg-muted aria-pressed:text-muted-foreground"
          >
            {follows ? "Following" : "Follow"}
          </button>
        )}
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
            {
              label: isSaved ? "Remove from favorites" : "Add to favorites",
              onSelect: () => {
                if (!savePending) toggleSave();
              },
            },
            {
              label: "Add to collection",
              onSelect: () => collect.current?.open(),
            },
            ...(viewerId && !own && !reported
              ? [
                  {
                    label: "Report art",
                    destructive: true,
                    onSelect: () => setReporting(true),
                  },
                ]
              : []),
          ]}
        />
        <CollectButton
          tileId={tile.id}
          signedIn={!!viewerId}
          headless
          controls={collect}
        />
      </div>
      {editing && (
        <EditDetailsDialog
          tileId={tile.id}
          thumbnail={tile.thumbnail}
          width={tile.width}
          height={tile.height}
          name={details.name}
          tags={details.tags}
          description={details.description}
          allowRemix={details.allowRemix}
          onSaved={setDetails}
          onClose={() => setEditing(false)}
        />
      )}

      <h1
        id="art-title"
        className={cn(
          madimiOne.className,
          "mt-2 text-[28px] leading-[1.1] tracking-[0.02em] break-words text-[#4a1f35]",
        )}
      >
        {details.name}
      </h1>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {tile.publishedAt &&
          `Published ${published.format(new Date(tile.publishedAt))}`}
        {tile.remixOf && (
          <>
            {tile.publishedAt && " · "}
            {tile.remixOf.tile ? (
              <>
                Remix of{" "}
                <Link
                  href={`/explore/${tile.remixOf.tile.id}`}
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  {tile.remixOf.tile.name}
                </Link>{" "}
                by{" "}
              </>
            ) : (
              "Remixed from "
            )}
            <Link
              href={`/u/${tile.remixOf.username}`}
              className="text-foreground underline-offset-2 hover:underline"
            >
              @{tile.remixOf.username}
            </Link>
          </>
        )}
      </p>

      {details.description && (
        <p className="mt-2 text-xs leading-snug break-words whitespace-pre-line">
          {details.description}
        </p>
      )}

      {details.tags.length > 0 && (
        <ul aria-label="Tags" className="mt-2 flex flex-wrap gap-2">
          {details.tags.map((tag) => (
            <li key={tag}>
              <Link
                href={`/explore?tag=${encodeURIComponent(tag)}`}
                className="block rounded-md bg-pastel-pink-soft px-2.5 py-1 text-[10px] text-[#4a1f35] transition-colors hover:bg-pastel-pink"
              >
                #{tag.toLowerCase()}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 grid grid-cols-4 gap-2">
        <Stat
          icon={
            <Svg>
              <path d={HEART} />
            </Svg>
          }
          value={like.count}
          label="Likes"
        />
        <Stat
          icon={
            <Svg>
              <path d="M13.5 7.5c0 2.8-2.5 5-5.5 5a6 6 0 0 1-2.4-.5L2.5 13l.9-2.6a4.7 4.7 0 0 1-.9-2.9c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5Z" />
            </Svg>
          }
          value={commentCount}
          label="Comments"
        />
        <Stat icon={<RemixIcon />} value={tile.remixes ?? 0} label="Remixes" />
        <Stat
          icon={
            <Svg>
              <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
              <circle cx="8" cy="8" r="2" />
            </Svg>
          }
          value={views}
          label="Views"
        />
      </div>

      <div
        className={cn(
          "mt-3 flex items-center gap-3 rounded-xl border px-4 py-2",
          canRemix
            ? "border-[#f3c9d8] bg-[#fdeef3]"
            : "border-[#ecd9e1] bg-[#f5eaef]",
        )}
      >
        <span className="shrink-0 text-[#4a1f35]">
          {canRemix ? (
            <RemixIcon />
          ) : (
            <Svg>
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
            </Svg>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold">
            {canRemix ? "Remixes allowed" : "Remixing is disabled"}
          </span>
          <span className="block text-[10px] text-muted-foreground">
            {canRemix
              ? "Make it your own. The original artist will be credited."
              : "The artist has turned off remixes for this artwork."}
          </span>
        </span>
        <button
          type="button"
          disabled={!canRemix || remixing || (!!viewerId && !file)}
          onClick={() => void remix()}
          className="h-7 shrink-0 cursor-pointer rounded-lg border border-primary/40 bg-background px-3 text-[11px] font-medium text-primary transition-colors hover:bg-pastel-pink-soft disabled:cursor-default disabled:bg-transparent disabled:opacity-50"
        >
          {!canRemix ? "Remix" : remixing ? "Opening…" : "Create remix →"}
        </button>
      </div>
      {error && (
        <FormMessage tone="error" className="mt-2 text-center">
          {error}
        </FormMessage>
      )}

      <div className="mt-3 grid grid-cols-4 gap-2">
        <button
          type="button"
          aria-pressed={like.liked}
          disabled={likePending}
          onClick={toggleLike}
          className={cn(
            ACTION,
            like.liked && "border-primary-soft bg-pastel-pink-soft text-primary",
          )}
        >
          {like.liked ? "Liked" : "Like"}
        </button>
        <button
          type="button"
          disabled={!canRemix || remixing || (!!viewerId && !file)}
          onClick={() => void remix()}
          className={ACTION}
        >
          Remix
        </button>
        <button
          type="button"
          disabled={!picture}
          onClick={() => setDownloading(true)}
          className={ACTION}
        >
          Download
        </button>
        <button type="button" onClick={() => void share()} className={ACTION}>
          {copied === "link" ? "Copied" : "Share"}
        </button>
      </div>
      {reporting && (
        <ReportDialog onReport={report} onClose={() => setReporting(false)} />
      )}
      {downloading && picture && (
        <DownloadArtDialog
          name={tile.name}
          author={author.username}
          thumbnail={tile.thumbnail}
          picture={picture}
          file={file}
          withFile={canRemix}
          onDownload={() => void recordDownload(tile.id)}
          onClose={() => setDownloading(false)}
        />
      )}
    </section>
  );
}
