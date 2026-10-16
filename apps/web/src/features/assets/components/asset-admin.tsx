"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Input } from "@pigxel/ui/components/input";
import { Text } from "@pigxel/ui/components/typography";
import {
  createAssetTag,
  moveAssetToFront,
  setAssetTags,
} from "../admin-actions";
import type { AssetTag } from "../server";

/** Admins tag an asset and choose which assets lead its pack. */
export function AssetAdmin({
  assetId,
  tags,
  onTags,
  allTags: initialTags,
}: {
  assetId: string;
  /** The asset's tag ids. */
  tags: string[];
  onTags: (tags: string[]) => void;
  allTags: AssetTag[];
}) {
  const client = useQueryClient();
  const [allTags, setAllTags] = useState(initialTags);
  const [newTag, setNewTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);

  const saveTags = async (next: string[]) => {
    const before = tags;
    onTags(next);
    setBusy(true);
    const { error } = await setAssetTags(assetId, next);
    setBusy(false);
    if (error) {
      onTags(before);
      setStatus({ error: true, text: error });
    } else {
      setStatus(null);
      void client.invalidateQueries({ queryKey: ["assets"] });
    }
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    setBusy(true);
    const { tag, error } = await createAssetTag(newTag);
    setBusy(false);
    if (error || !tag) return setStatus({ error: true, text: error ?? "" });
    setAllTags((list) =>
      list.some((t) => t.id === tag.id) ? list : [...list, tag],
    );
    setNewTag("");
    if (!tags.includes(tag.id)) await saveTags([...tags, tag.id]);
  };

  const toFront = async () => {
    setBusy(true);
    const { error } = await moveAssetToFront(assetId);
    setBusy(false);
    setStatus(
      error ? { error: true, text: error } : { text: "It now leads its pack." },
    );
    if (!error) void client.invalidateQueries({ queryKey: ["assets"] });
  };

  return (
    <div className="grid gap-3 rounded-xl border border-dashed p-3">
      <Text size="xs" tone="muted" className="font-semibold">
        Admin
      </Text>
      <div role="group" aria-label="Tags" className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => {
          const on = tags.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={on}
              disabled={busy}
              onClick={() =>
                void saveTags(
                  on ? tags.filter((t) => t !== tag.id) : [...tags, tag.id],
                )
              }
              className="h-7 rounded-full border px-2.5 text-xs transition-colors hover:bg-muted aria-pressed:border-transparent aria-pressed:bg-[#fde2ea] disabled:opacity-60"
            >
              {tag.name}
            </button>
          );
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void addTag();
        }}
        className="flex gap-2"
      >
        <Input
          aria-label="New tag"
          placeholder="New tag"
          maxLength={40}
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          className="h-8 text-xs"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={busy}>
          Add
        </Button>
      </form>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => void toFront()}
      >
        Show first in pack
      </Button>
      {status && (
        <Text role="status" size="xs" tone={status.error ? "error" : "muted"}>
          {status.text}
        </Text>
      )}
    </div>
  );
}
