"use client";

import { useState } from "react";
import { OptionMenu } from "@/features/explore/components/explore-header/components/option-menu";
import { MAX_BLOCK_NAME } from "../../../constants";
import type { ReviewBlock, ReviewTarget, ReviewTile } from "../../../types";
import { useReviewActions } from "../../../use-asset-review";
import { PILL, REVIEW_GRID } from "../constants";
import { errorText } from "../helpers";
import { TileCard } from "./tile-card";

const NEW_BLOCK = "new";

function BlockName({
  block,
  onError,
}: {
  block: ReviewBlock;
  onError: (message: string) => void;
}) {
  const { renameBlock } = useReviewActions();
  const [name, setName] = useState(block.name);

  const save = async () => {
    const next = name.trim();
    if (!next || next === block.name) return setName(block.name);
    try {
      await renameBlock(block.id, next);
      onError("");
    } catch (e) {
      onError(errorText(e));
      setName(block.name);
    }
  };

  return (
    <input
      aria-label="Block name"
      maxLength={MAX_BLOCK_NAME}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setName(block.name);
      }}
      className="-mx-2 w-full max-w-md rounded-lg border border-transparent bg-transparent px-2 font-display text-xl tracking-tight outline-none hover:border-input focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
    />
  );
}

export function BlockSection({
  block,
  targets,
  tiles,
  background,
}: {
  block: ReviewBlock;
  targets: ReviewTarget[];
  tiles: ReviewTile[];
  background: string;
}) {
  const { setBlockPremium, setBlockTarget } = useReviewActions();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const approved = block.tiles.filter((t) => t.state === "approved").length;
  const target = targets.find((t) => t.id === block.target);

  const act = async (action: () => Promise<unknown>) => {
    setPending(true);
    try {
      await action();
      setError("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-label={block.name} className="mt-10 first:mt-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          {block.target === null ? (
            <BlockName key={block.name} block={block} onError={setError} />
          ) : (
            <h2 className="font-display text-xl tracking-tight">
              {target?.name ?? block.target}
            </h2>
          )}
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {block.target === null ? "New block" : "Adds to an existing block"}{" "}
            · {block.id} · {block.tiles.length} in review · {approved} approved
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OptionMenu
            label="Goes to"
            options={[
              { value: NEW_BLOCK, label: "New block" },
              ...targets
                .filter((t) => t.id !== block.id)
                .map((t) => ({ value: t.id, label: `Add to ${t.name}` })),
            ]}
            value={block.target ?? NEW_BLOCK}
            onChange={(value) =>
              act(() =>
                setBlockTarget(block.id, value === NEW_BLOCK ? null : value),
              )
            }
          />
          <button
            type="button"
            aria-pressed={block.premium}
            disabled={pending}
            onClick={() => act(() => setBlockPremium(block.id, !block.premium))}
            className={PILL}
          >
            All premium
          </button>
        </div>
      </div>
      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
      {block.issues.length > 0 && (
        <ul className="mb-3 space-y-0.5 text-xs text-destructive">
          {block.issues.map((issue, i) => (
            <li key={i}>{issue.message}</li>
          ))}
        </ul>
      )}
      <ul className={REVIEW_GRID}>
        {tiles.map((tile) => (
          <li key={tile.key} className="flex [&>*]:flex-1">
            <TileCard
              tile={tile}
              background={background}
              blockPremium={block.premium}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
