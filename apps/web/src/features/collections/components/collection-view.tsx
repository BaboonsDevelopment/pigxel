"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { Heading } from "@pigxel/ui/components/typography";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import type { PublicTile } from "@/features/profile/profile";
import { PopularCard } from "@/features/explore/components/popular-card/popular-card";
import styles from "@/features/explore/components/gallery.module.css";
import { deleteCollection, setInCollection } from "../actions";
import type { Collection } from "../collections";
import { CollectionDialog } from "./collection-dialog";

const BUTTON =
  "flex h-8 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-xs transition-colors hover:bg-muted";

export function CollectionView({
  collection,
  tiles,
  isOwner,
}: {
  collection: Collection;
  tiles: PublicTile[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { author } = collection;
  const shown = tiles.filter((tile) => !removed.has(tile.id));

  const remove = async (tile: PublicTile) => {
    setError(null);
    setRemoved((ids) => new Set(ids).add(tile.id));
    const result = await setInCollection(collection.id, tile.id, false);
    if (!result.error) return;
    setError(result.error);
    setRemoved((ids) => {
      const next = new Set(ids);
      next.delete(tile.id);
      return next;
    });
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share)
        await navigator.share({ title: collection.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {}
  };

  const destroy = async () => {
    const confirmed = await confirmDialog({
      title: `Delete “${collection.name}”?`,
      message: "The collection goes away. The arts in it stay where they are.",
      confirmLabel: "Delete",
    });
    if (!confirmed) return;
    const result = await deleteCollection(collection.id);
    if (result.error) return setError(result.error);
    router.push(`/u/${author.username}`);
  };

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Collection</p>
          <Heading size="page" className="mt-1 text-3xl break-words">
            {collection.name}
          </Heading>
          <p className="mt-2 flex items-center gap-2 text-sm">
            <Link
              href={`/u/${author.username}`}
              className="flex items-center gap-1.5 hover:text-primary"
            >
              <ProfileAvatar
                name={author.name}
                url={author.avatarUrl}
                className="size-5 text-[9px]"
              />
              @{author.username}
            </Link>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <span className="text-muted-foreground">
              {shown.length === 1 ? "1 art" : `${shown.length} arts`}
            </span>
          </p>
          {collection.description && (
            <p className="mt-3 max-w-prose text-sm leading-relaxed whitespace-pre-line break-words">
              {collection.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void share()} className={BUTTON}>
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
            {copied ? "Link copied" : "Share"}
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={BUTTON}
            >
              Edit
            </button>
          )}
        </div>
      </header>

      {error && (
        <FormMessage tone="error" className="mt-4">
          {error}
        </FormMessage>
      )}

      {shown.length ? (
        <section className={`${styles.gallery} mt-8`}>
          <ul className={styles.grid}>
            {shown.map((tile, i) => (
              <PopularCard
                key={tile.id}
                tile={tile}
                delay={Math.min(i, 12) * 30}
                menu={
                  isOwner
                    ? [
                        {
                          label: "Remove from collection",
                          destructive: true,
                          onSelect: () => void remove(tile),
                        },
                      ]
                    : []
                }
              />
            ))}
          </ul>
        </section>
      ) : (
        <EmptyState
          className="mt-12"
          title="No arts here yet"
          description={
            isOwner
              ? "Open any art in Explore and tap “Collect” to add it here."
              : undefined
          }
        />
      )}

      {editing && (
        <CollectionDialog
          collection={collection}
          onDelete={() => {
            setEditing(false);
            void destroy();
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
