"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ModalButton, modalButton } from "@/components/ui/modal-button";
import { Dialog, DialogBody, DialogFooter } from "@pigxel/ui/components/dialog";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { Textarea } from "@pigxel/ui/components/input";
import { Text } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { PixelImage } from "@/components/ui/pixel-image";
import { showSnackbar, withLoading } from "@/components/ui/snackbar";
import type { ProfileTile } from "@/features/profile/profile";
import {
  loadArtDetails,
  loadUnpublishedTiles,
  publishArt,
} from "../../../actions";
import { DESCRIPTION_MAX } from "../../../constants";
import { removeFromExplore } from "../../../remove-from-explore";
import { RemixToggle } from "./remix-toggle";
import { TagPicker } from "./tag-picker";

export type PublishTile = Pick<
  ProfileTile,
  "id" | "name" | "width" | "height" | "thumbnail"
>;

export function PublishDialog({
  tile,
  onPublished,
  onUnpublished,
  onClose,
}: {
  tile?: PublishTile;
  onPublished?: () => void;
  onUnpublished?: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tiles, setTiles] = useState<ProfileTile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublishTile | null>(tile ?? null);
  const [step, setStep] = useState<"pick" | "details" | "done">(
    tile ? "details" : "pick",
  );
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [allowRemix, setAllowRemix] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [loaded, setLoaded] = useState(!tile);

  const tileId = tile?.id;
  useEffect(() => {
    if (tileId) {
      loadArtDetails(tileId)
        .then((details) => {
          if (!details) {
            setError("Couldn’t find this art in Pigxel cloud.");
            return;
          }
          setTags(details.tags);
          setDescription(details.description);
          setAllowRemix(details.allowRemix);
          setPublished(details.published);
          setLoaded(true);
        })
        .catch(() => setError("Couldn’t load this art. Try again."));
      return;
    }
    loadUnpublishedTiles()
      .then(setTiles)
      .catch(() => setError("Couldn’t load your arts. Try again."));
  }, [tileId]);

  const publish = async () => {
    if (!selected) return;
    setPublishing(true);
    setError(null);
    const result = await withLoading(
      published ? "Saving…" : "Publishing…",
      () => publishArt(selected.id, tags, description, allowRemix),
    );
    setPublishing(false);
    if (!result.error && !published) {
      const id = selected.id;
      showSnackbar("Project published!", {
        tone: "action",
        action: { label: "View", onClick: () => router.push(`/explore/${id}`) },
      });
    }
    if (result.error) setError(result.error);
    else if (tile) {
      onPublished?.();
      setStep("done");
    } else onClose();
  };

  const unpublish = async () => {
    if (!selected) return;
    setError(null);
    setPublishing(true);
    const result = await removeFromExplore(selected);
    setPublishing(false);
    if (result.error) setError(result.error);
    if (!result.removed) return;
    onUnpublished?.();
    onClose();
  };

  return (
    <Dialog onClose={onClose} size={step === "pick" ? "lg" : "sm"} portal>
      <ModalHeader
        title={
          step === "pick"
            ? "Publish Project"
            : step === "done"
              ? published
                ? "Changes Saved"
                : "Published!"
              : published
                ? "Explore Details"
                : "Publish Project"
        }
      />
      <DialogBody className="py-5">
        {step === "pick" && (
          <p className="mb-4 text-sm text-muted-foreground">
            Pick an art from Pigxel cloud to share with the community.
          </p>
        )}
        {error && (
          <FormMessage tone="error" className="mb-3">
            {error}
          </FormMessage>
        )}
        {step === "done" && selected ? (
          <div className="flex items-center gap-4 animate-in fade-in zoom-in-95">
            <span className="block aspect-[5/4] w-32 shrink-0 overflow-hidden rounded-xl border bg-checker">
              {selected.thumbnail && (
                <PixelImage
                  src={selected.thumbnail}
                  alt=""
                  className="size-full object-cover"
                />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">
                {selected.name}
              </span>
              {tags.length > 0 && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {tags.join(" · ")}
                </span>
              )}
            </span>
          </div>
        ) : step === "details" && selected && !loaded ? (
          !error && (
            <Text as="span" tone="muted">
              Loading…
            </Text>
          )
        ) : step === "details" && selected ? (
          <div className="grid gap-5">
            <div className="flex items-center gap-4">
              <span className="block size-20 shrink-0 overflow-hidden rounded-xl border border-primary-soft bg-pastel-pink-soft">
                {selected.thumbnail && (
                  <PixelImage
                    src={selected.thumbnail}
                    alt=""
                    className="size-full object-contain"
                  />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {selected.name}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {selected.width} × {selected.height} px
                </span>
              </span>
            </div>
            <label className="block">
              <span className="mb-2 flex justify-between text-xs font-semibold">
                Description
                <span className="font-normal text-muted-foreground tabular-nums">
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              </span>
              <Textarea
                rows={3}
                maxLength={DESCRIPTION_MAX}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A cozy cottage tucked between mountains…"
                className="rounded-xl px-4 py-3"
              />
            </label>
            <div>
              <span className="mb-2 block text-xs font-semibold">Tags</span>
              <TagPicker
                value={tags}
                onChange={setTags}
                className="min-h-12 rounded-xl px-4"
              />
            </div>
            <RemixToggle value={allowRemix} onChange={setAllowRemix} />
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
                          className="size-full object-cover"
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
        <DialogFooter
          className={cn(MODAL_FOOTER, "items-center justify-between")}
        >
          {tile && published ? (
            <ModalButton
              type="button"
              variant="secondary"
              disabled={publishing}
              onClick={() => void unpublish()}
              className="border-transparent text-destructive hover:bg-destructive/10"
            >
              Unpublish
            </ModalButton>
          ) : tile ? (
            <ModalButton
              type="button"
              variant="secondary"
              disabled={publishing}
              onClick={onClose}
            >
              Cancel
            </ModalButton>
          ) : (
            <ModalButton
              type="button"
              variant="secondary"
              disabled={publishing}
              onClick={() => setStep("pick")}
            >
              Back
            </ModalButton>
          )}
          <span className="flex items-center gap-2">
            {tile && published && (
              <ModalButton
                type="button"
                variant="secondary"
                disabled={publishing}
                onClick={onClose}
              >
                Cancel
              </ModalButton>
            )}
            <ModalButton
              type="button"
              disabled={publishing || !loaded}
              onClick={() => void publish()}
            >
              {published
                ? publishing
                  ? "Saving…"
                  : "Save"
                : publishing
                  ? "Publishing…"
                  : "Publish"}
            </ModalButton>
          </span>
        </DialogFooter>
      )}
      {step === "done" && selected && (
        <DialogFooter
          className={cn(MODAL_FOOTER, "items-center justify-between")}
        >
          <ModalButton type="button" variant="secondary" onClick={onClose}>
            Done
          </ModalButton>
          <Link href={`/explore/${selected.id}`} className={modalButton()}>
            View on Explore
          </Link>
        </DialogFooter>
      )}
    </Dialog>
  );
}
