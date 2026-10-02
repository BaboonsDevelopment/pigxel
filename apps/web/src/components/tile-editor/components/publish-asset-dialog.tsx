"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import { Field, FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { SectionTitle } from "@pigxel/ui/components/typography";
import {
  ASSET_CATEGORIES,
  isAssetCategory,
  type AssetCategory,
} from "@/lib/assets/assets";
import {
  ASSET_NAME_MAX,
  assetIdFor,
  assetExists,
  publishAsset,
} from "@/lib/assets/publish";
import type { PigxelDocument } from "@/lib/pigxel-file/format";

type Status =
  | { state: "editing" }
  | { state: "publishing" }
  | { state: "replace"; id: string }
  | { state: "done"; id: string }
  | { state: "error"; message: string };

/**
 * File › Publish to Assets… (admins): the tile as it is now goes on the
 * Assets page under a name and a kind. A name already taken asks first,
 * then replaces that asset.
 */
export default function PublishAssetDialog({
  name: initialName,
  document,
  onClose,
}: {
  name: string;
  /** The tile at the moment it's published. */
  document: () => PigxelDocument;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(initialName.slice(0, ASSET_NAME_MAX));
  const [category, setCategory] = useState<AssetCategory>("items");
  const [status, setStatus] = useState<Status>({ state: "editing" });
  const id = assetIdFor(name);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const publish = async () => {
    if (!id) return;
    setStatus({ state: "publishing" });
    try {
      const replacing = status.state === "replace" && status.id === id;
      if (!replacing && (await assetExists(id))) {
        setStatus({ state: "replace", id });
        return;
      }
      await publishAsset({
        id,
        name: name.trim(),
        category,
        document: document(),
      });
      setStatus({ state: "done", id });
    } catch (e) {
      setStatus({
        state: "error",
        message:
          e instanceof Error ? e.message : "Couldn’t publish it. Try again.",
      });
    }
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dimmed backdrop closes it.
        if (e.target === dialog.current) dialog.current.close();
      }}
      aria-labelledby="publish-asset-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border bg-background p-5 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <SectionTitle id="publish-asset-title">Publish to Assets</SectionTitle>
      {status.state === "done" ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            “{name.trim()}” is on the Assets page for everyone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Link
              href={`/assets?type=${category}`}
              target="_blank"
              className={buttonVariants({ variant: "secondary" })}
            >
              See it
            </Link>
            <Button type="button" onClick={() => dialog.current?.close()}>
              Done
            </Button>
          </div>
        </>
      ) : (
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void publish();
          }}
        >
          <p className="text-sm text-muted-foreground">
            Everyone can start a tile from it or drop it into theirs. Every
            layer but references, and every frame, goes with it.
          </p>
          <Field
            label="Name"
            htmlFor="asset-name"
            hint={id ? `Its id: ${id}` : "Use letters or numbers."}
          >
            <Input
              id="asset-name"
              required
              maxLength={ASSET_NAME_MAX}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setStatus({ state: "editing" });
              }}
            />
          </Field>
          <Field label="Kind" htmlFor="asset-category">
            <select
              id="asset-category"
              value={category}
              onChange={(e) => {
                if (isAssetCategory(e.target.value))
                  setCategory(e.target.value);
              }}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              {ASSET_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          {status.state === "replace" && (
            <FormMessage>
              An asset with the id “{status.id}” is there already. Publishing
              replaces it.
            </FormMessage>
          )}
          {status.state === "error" && (
            <FormMessage tone="error">{status.message}</FormMessage>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </Button>
            <Button disabled={!id || status.state === "publishing"}>
              {status.state === "publishing"
                ? "Publishing…"
                : status.state === "replace"
                  ? "Replace it"
                  : "Publish"}
            </Button>
          </div>
        </form>
      )}
    </dialog>
  );
}
