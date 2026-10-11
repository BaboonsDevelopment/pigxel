"use client";

import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import type { ToolOptionProps } from "../types";
import { SliceOptions } from "./slice-fields";
import { SlicesDialog } from "./slices-dialog";

export function SliceOption({
  slice,
  slices,
  onSliceChange,
  onSliceDelete,
  onSlicePick,
  onSlicesChange,
}: ToolOptionProps) {
  const [listing, setListing] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={!slices.length}
        title="See every slice to pick, rename or delete it"
        onClick={() => setListing(true)}
      >
        Slices ({slices.length})…
      </Button>
      {slice && (
        <SliceOptions
          slice={slice}
          onChange={onSliceChange}
          onDelete={onSliceDelete}
        />
      )}
      {listing && (
        <SlicesDialog
          slices={slices}
          picked={slice?.id ?? null}
          onPick={onSlicePick}
          onChange={onSlicesChange}
          onClose={() => setListing(false)}
        />
      )}
    </>
  );
}
