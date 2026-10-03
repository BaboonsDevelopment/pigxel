"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import { downloadBlob } from "@/lib/download";
import { toGpl } from "@/lib/palette/files";
import { PALETTE_PRESETS, type PalettePreset } from "@/lib/palette/presets";

export function PaletteList() {
  return (
    <section aria-labelledby="assets-palettes" className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2
          id="assets-palettes"
          className="font-display text-xl tracking-tight"
        >
          Palettes
        </h2>
        <p className="text-xs text-muted-foreground">
          In the editor, pick one from the palette panel’s Load… menu.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PALETTE_PRESETS.map((palette) => (
          <li key={palette.id}>
            <PaletteCard palette={palette} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PaletteCard({ palette }: { palette: PalettePreset }) {
  const [copied, setCopied] = useState(false);
  const { colors } = palette;

  const copy = () =>
    navigator.clipboard?.writeText(colors.join("\n")).then(
      () => setCopied(true),
      () => {},
    );

  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="truncate font-semibold">{palette.name}</h3>
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {colors.length} colours
        </span>
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {palette.author ? `by ${palette.author} · ` : ""}
        <a
          href={`https://lospec.com/palette-list/${palette.id}`}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:text-foreground hover:underline"
        >
          Lospec
        </a>
      </p>
      <ul
        aria-label={`${palette.name} colours`}
        className="mt-3 grid overflow-hidden rounded-lg ring-1 ring-black/10"
        style={{
          gridTemplateColumns: `repeat(${Math.min(colors.length, 16)}, minmax(0, 1fr))`,
        }}
      >
        {colors.map((color) => (
          <li
            key={color}
            title={color}
            className="h-5"
            style={{ backgroundColor: color }}
          />
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
        <Link
          href={`/tiles/new?palette=${palette.id}`}
          className={buttonVariants({ size: "sm" })}
        >
          New tile with it
        </Link>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void copy()}
        >
          {copied ? "Copied" : "Copy hex"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            downloadBlob(
              new Blob([toGpl(colors, palette.name)], { type: "text/plain" }),
              `${palette.id}.gpl`,
            )
          }
        >
          .gpl
        </Button>
      </div>
    </div>
  );
}
