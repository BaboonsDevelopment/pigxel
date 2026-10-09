"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { scrollParent } from "@/lib/utils/scroll-parent";
import { FormMessage } from "@pigxel/ui/components/field";
import { PixelImage } from "@/components/ui/pixel-image";
import { setTileSaved } from "@/features/explore/actions";
import { PublishDialog } from "@/features/explore/components/explore-header/components/publish-dialog";
import { formatCount } from "@/features/explore/components/popular-card/helpers";
import { ProjectCard } from "@/features/tiles/components/project-card/project-card";
import { PinBadge } from "@/features/tiles/components/projects-view/components/project-grid/badges";
import { StatIcon } from "@/features/tiles/components/projects-view/components/stat-icons";
import { useCloudTileActions } from "@/features/tiles/tile-actions";
import { useSortable } from "@/features/tiles/components/projects-view/drag/use-sortable";
import {
  loadMoreProfileArts,
  reorderPins,
  setTilePinned,
  setTileVisibility,
} from "../../actions";
import {
  MAX_PINS,
  type ArtsKind,
  type ArtsQuery,
  type ProfileTile,
} from "../../profile";
import { PROFILE_GRID } from "../profile-hero/constants";
import { ReviewBadge } from "./components/review-badge";

type Change = { id: string; remove?: boolean; pinOrder?: number | null };

const PRELOAD = "1500px";

export function ProfileArts({
  profileId,
  tiles,
  count,
  kind,
  query,
  isOwner,
  viewerId,
}: {
  query: ArtsQuery;
  profileId: string;
  tiles: ProfileTile[];
  count: number;
  kind: ArtsKind;
  isOwner: boolean;
  viewerId: string | null;
}) {
  const [extra, setExtra] = useState<ProfileTile[]>([]);
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const firstIds = new Set(tiles.map((tile) => tile.id));
  const loaded = [...tiles, ...extra.filter((tile) => !firstIds.has(tile.id))];
  const hasMore = !ended && loaded.length < count;

  useEffect(() => {
    const target = sentinel.current;
    if (!hasMore || loading || !target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setLoading(true);
        void loadMoreProfileArts(profileId, kind, loaded.length, query).then(
          (more) => {
            if (more.length === 0) setEnded(true);
            setExtra((all) => [...all, ...more]);
            setLoading(false);
          },
        );
      },
      { root: scrollParent(target), rootMargin: `0px 0px ${PRELOAD} 0px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, profileId, kind, loaded.length, query]);

  const [shown, apply] = useOptimistic(loaded, (all, change: Change) =>
    change.remove
      ? all.filter((tile) => tile.id !== change.id)
      : all.map((tile) =>
          tile.id === change.id
            ? { ...tile, pinOrder: change.pinOrder ?? null }
            : tile,
        ),
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<ProfileTile | null>(null);
  const [published, setPublished] = useState<ReadonlySet<string>>(new Set());
  const [, startTransition] = useTransition();
  const cloud = useCloudTileActions(viewerId ?? "");
  const router = useRouter();

  const run = (change: Change, save: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      apply(change);
      setError(null);
      const result = await save();
      if (result.error) setError(result.error);
    });

  const togglePin = (tile: ProfileTile) => {
    if (tile.pinOrder) {
      run({ id: tile.id, pinOrder: null }, () => setTilePinned(tile.id, false));
      return;
    }
    if (shown.filter((t) => t.pinOrder).length >= MAX_PINS) {
      setError(`You can pin up to ${MAX_PINS} arts. Unpin one first.`);
      return;
    }
    run({ id: tile.id, pinOrder: MAX_PINS }, () =>
      setTilePinned(tile.id, true),
    );
  };

  const copyLink = async (tile: ProfileTile) => {
    try {
      await navigator.clipboard.writeText(
        new URL(`/explore/${tile.id}`, window.location.origin).href,
      );
      setCopied(tile.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const menuOf = (tile: ProfileTile) => {
    const copy = {
      label: copied === tile.id ? "Link copied" : "Copy link",
      onSelect: () => void copyLink(tile),
    };
    if (kind === "drafts")
      return [
        { label: "Open in editor", onSelect: () => void cloud.open(tile) },
        { label: "Publish to Explore…", onSelect: () => setPublishing(tile) },
      ];
    if (kind === "published" && isOwner)
      return [
        {
          label: tile.pinOrder ? "Unpin" : "Pin to top",
          onSelect: () => togglePin(tile),
        },
        {
          label: "Edit tags and description…",
          onSelect: () => setPublishing(tile),
        },
        { label: "Open in editor", onSelect: () => void cloud.open(tile) },
        copy,
        {
          label: "Remove from Explore",
          destructive: true,
          onSelect: () =>
            run({ id: tile.id, remove: true }, () =>
              setTileVisibility(tile.id, "private"),
            ),
        },
      ];
    if (kind === "saved" && isOwner)
      return [
        copy,
        {
          label: "Remove from saved",
          destructive: true,
          onSelect: () =>
            run({ id: tile.id, remove: true }, () =>
              setTileSaved(tile.id, false),
            ),
        },
      ];
    return [copy];
  };

  const visible = shown.filter((tile) => !published.has(tile.id));
  const ordered =
    kind === "published" && query.sort === "newest"
      ? [...visible].sort(
          (a, b) =>
            (a.pinOrder ?? Infinity) - (b.pinOrder ?? Infinity) ||
            b.updatedAt.localeCompare(a.updatedAt),
        )
      : visible;
  const sortable =
    kind === "published" && isOwner && query.sort === "newest" && !query.tag;
  const pins = useSortable(
    ordered.filter((tile) => tile.pinOrder),
    (ids) =>
      startTransition(async () => {
        setError(null);
        const result = await reorderPins(ids);
        if (result.error) setError(result.error);
      }),
  );
  const list = sortable
    ? [...pins.items, ...ordered.filter((tile) => !tile.pinOrder)]
    : ordered;

  return (
    <>
      {(error ?? cloud.error) && (
        <FormMessage tone="error" className="mb-4">
          {error ?? cloud.error}
        </FormMessage>
      )}
      <ul className={PROFILE_GRID}>
        {list.map((tile) => (
          <ProjectCard
            key={tile.id}
            sort={
              sortable && tile.pinOrder ? pins.itemProps(tile.id) : undefined
            }
            name={tile.name}
            thumbnail={
              tile.thumbnail && <PixelImage src={tile.thumbnail} alt="" />
            }
            badges={
              (tile.pinOrder || tile.inReview) && (
                <>
                  {tile.pinOrder && kind === "published" && <PinBadge />}
                  {tile.inReview && <ReviewBadge />}
                </>
              )
            }
            meta={
              kind === "drafts" ? (
                `${tile.width} × ${tile.height} px`
              ) : (
                <span className="flex items-center gap-3 tabular-nums [&_svg]:size-3.5">
                  <span className="flex items-center gap-1">
                    <StatIcon stat="likes" />
                    {formatCount(tile.likes ?? 0)}
                  </span>
                  <span className="flex items-center gap-1">
                    <StatIcon stat="views" />
                    {formatCount(tile.views ?? 0)}
                  </span>
                </span>
              )
            }
            open={
              kind === "drafts"
                ? { onClick: () => void cloud.open(tile) }
                : { href: `/explore/${tile.id}` }
            }
            opening={cloud.busy === tile.id}
            disabled={cloud.busy !== null}
            menu={menuOf(tile)}
          />
        ))}
      </ul>
      {hasMore && <div ref={sentinel} aria-hidden="true" className="h-px" />}
      {publishing && (
        <PublishDialog
          tile={publishing}
          onPublished={() => {
            if (kind === "drafts")
              setPublished((ids) => new Set(ids).add(publishing.id));
            else router.refresh();
          }}
          onUnpublished={() => {
            if (kind === "published")
              setPublished((ids) => new Set(ids).add(publishing.id));
          }}
          onClose={() => setPublishing(null)}
        />
      )}
    </>
  );
}
