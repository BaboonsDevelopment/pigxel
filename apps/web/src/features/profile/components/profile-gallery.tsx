"use client";

import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import { Heading } from "@pigxel/ui/components/typography";
import { setTilePinned, setTileVisibility } from "../actions";
import { MAX_PINS, type ProfileTile } from "../profile";
import { ArtCard } from "./art-card";

type Change = Pick<ProfileTile, "id"> &
  Partial<Pick<ProfileTile, "visibility" | "pinOrder">>;

export function ProfileGallery({
  tiles,
  isOwner,
  children,
}: {
  tiles: ProfileTile[];
  isOwner: boolean;
  children?: ReactNode;
}) {
  const [shown, applyChange] = useOptimistic(tiles, (all, change: Change) =>
    all.map((tile) => (tile.id === change.id ? { ...tile, ...change } : tile)),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  const run = (change: Change, save: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      applyChange(change);
      setErrors((all) => {
        const next = { ...all };
        delete next[change.id];
        return next;
      });
      const { error } = await save();
      if (error) setErrors((all) => ({ ...all, [change.id]: error }));
    });

  const togglePublic = (tile: ProfileTile) => {
    const visibility = tile.visibility === "public" ? "private" : "public";
    run({ id: tile.id, visibility }, () =>
      setTileVisibility(tile.id, visibility),
    );
  };

  const togglePin = (tile: ProfileTile) => {
    if (tile.pinOrder) {
      run({ id: tile.id, pinOrder: null }, () => setTilePinned(tile.id, false));
      return;
    }
    const taken = new Set(shown.map((t) => t.pinOrder));
    const slot = Array.from({ length: MAX_PINS }, (_, i) => i + 1).find(
      (n) => !taken.has(n),
    );
    if (!slot) {
      setErrors((all) => ({
        ...all,
        [tile.id]: `You can pin up to ${MAX_PINS} arts. Unpin one first.`,
      }));
      return;
    }
    run({ id: tile.id, pinOrder: slot }, () => setTilePinned(tile.id, true));
  };

  const card = (tile: ProfileTile) => (
    <ArtCard
      key={tile.id}
      tile={tile}
      isOwner={isOwner}
      error={errors[tile.id]}
      onTogglePublic={() => togglePublic(tile)}
      onTogglePin={() => togglePin(tile)}
    />
  );
  const pinned = shown
    .filter((t) => t.pinOrder !== null)
    .sort((a, b) => a.pinOrder! - b.pinOrder!);
  const rest = shown
    .filter((t) => t.pinOrder === null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <>
      {(pinned.length > 0 || (isOwner && shown.length > 0)) && (
        <Gallery title="Pinned">
          {pinned.map(card)}
          {isOwner &&
            Array.from({ length: MAX_PINS - pinned.length }, (_, i) => (
              <EmptyPin key={i} />
            ))}
        </Gallery>
      )}
      {children}
      {rest.length > 0 && (
        <Gallery title={pinned.length > 0 ? "All arts" : "Arts"}>
          {rest.map(card)}
        </Gallery>
      )}
    </>
  );
}

function Gallery({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <Heading>{title}</Heading>
      <ul className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {children}
      </ul>
    </section>
  );
}

function EmptyPin() {
  return (
    <li className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-soft bg-white/50 p-4 text-center text-xs text-muted-foreground">
      <span aria-hidden="true" className="text-lg text-primary">
        ✦
      </span>
      Pin an art from below to show it here
    </li>
  );
}
