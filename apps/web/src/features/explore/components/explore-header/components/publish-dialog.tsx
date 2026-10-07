"use client";

import { useEffect, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@pigxel/ui/components/dialog";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { Textarea } from "@pigxel/ui/components/input";
import { Text } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";
import type { ProfileTile } from "@/features/profile/profile";
import { loadUnpublishedTiles, publishArt } from "../../../actions";
import { DESCRIPTION_MAX } from "../../../constants";
import { TagPicker } from "./tag-picker";

export function PublishDialog({ onClose }: { onClose: () => void }) {
  const [tiles, setTiles] = useState<ProfileTile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProfileTile | null>(null);
  const [step, setStep] = useState<"pick" | "details">("pick");
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadUnpublishedTiles()
      .then(setTiles)
      .catch(() => setError("Couldn’t load your arts. Try again."));
  }, []);

  const publish = async () => {
    if (!selected) return;
    setPublishing(true);
    setError(null);
    const result = await publishArt(selected.id, tags, description);
    setPublishing(false);
    if (result.error) setError(result.error);
    else onClose();
  };

  return (
    <Dialog onClose={onClose} size="lg" portal>
      <DialogHeader
        title={step === "pick" ? "Publish to Explore" : "Tell people about it"}
        description={
          step === "pick"
            ? "Pick an art from Pigxel cloud to share with the community."
            : "Tags help people find it. The description shows on its page."
        }
      />
      <DialogBody>
        {error && (
          <FormMessage tone="error" className="mb-3">
            {error}
          </FormMessage>
        )}
        {step === "details" && selected ? (
          <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <div>
              <span className="block aspect-[5/4] overflow-hidden rounded-xl border bg-checker">
                {selected.thumbnail && (
                  <PixelImage
                    src={selected.thumbnail}
                    alt=""
                    className="size-full object-contain"
                  />
                )}
              </span>
              <span className="mt-2 block truncate text-sm font-semibold">
                {selected.name}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {selected.width} × {selected.height} px
              </span>
            </div>
            <div className="grid content-start gap-4">
              <div>
                <span className="mb-1.5 block text-xs font-medium">Tags</span>
                <TagPicker value={tags} onChange={setTags} />
              </div>
              <label className="block">
                <span className="mb-1.5 flex justify-between text-xs font-medium">
                  Description
                  <span className="font-normal text-muted-foreground tabular-nums">
                    {description.length}/{DESCRIPTION_MAX}
                  </span>
                </span>
                <Textarea
                  rows={5}
                  maxLength={DESCRIPTION_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A cozy cottage tucked between mountains…"
                />
              </label>
            </div>
          </div>
        ) : !tiles ? (
          !error && (
            <Text as="span" tone="muted">
              Loading…
            </Text>
          )
        ) : tiles.length === 0 ? (
          <EmptyState
            title="Nothing to publish"
            description="Save an art to Pigxel cloud and it will show up here."
          />
        ) : (
          <ul
            aria-label="Art to publish"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {tiles.map((tile) => {
              const checked = selected?.id === tile.id;
              return (
                <li key={tile.id}>
                  <button
                    type="button"
                    aria-label={`Publish ${tile.name}`}
                    onClick={() => {
                      setSelected(tile);
                      setStep("details");
                    }}
                    className={cn(
                      "relative block w-full cursor-pointer overflow-hidden rounded-xl border bg-card text-left transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/30",
                      checked && "border-primary ring-2 ring-primary",
                    )}
                  >
                    <span className="block aspect-[5/4] bg-checker">
                      {tile.thumbnail && (
                        <PixelImage
                          src={tile.thumbnail}
                          alt=""
                          loading="lazy"
                          className="size-full object-contain"
                        />
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-2 right-2 flex size-7 items-center justify-center rounded-full border shadow-sm transition-colors",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background text-foreground",
                      )}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-3.5"
                      >
                        <path
                          d={checked ? "m3.5 8.5 3 3 6-7" : "M8 3v10M3 8h10"}
                        />
                      </svg>
                    </span>
                    <span className="block border-t px-2.5 py-2">
                      <span className="block truncate text-sm font-semibold">
                        {tile.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {tile.width} × {tile.height} px
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogBody>
      {step === "details" && (
        <DialogFooter className="items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            disabled={publishing}
            onClick={() => setStep("pick")}
          >
            Back
          </Button>
          <Button
            type="button"
            disabled={publishing}
            onClick={() => void publish()}
          >
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        </DialogFooter>
      )}
    </Dialog>
  );
}
