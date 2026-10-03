"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import { cardVariants } from "@pigxel/ui/components/card";
import {
  linkVariants,
  SectionHeader,
  Text,
} from "@pigxel/ui/components/typography";
import { downloadBlob } from "@/lib/download";
import { toGpl } from "@/lib/palette/files";
import { PALETTE_PRESETS, type PalettePreset } from "@/lib/palette/presets";

export function PaletteList() {
  return (
    <section aria-labelledby="assets-palettes" className="mt-8">
      <SectionHeader
        id="assets-palettes"
        title="Palettes"
        actions={
          <Text size="xs" tone="muted">
            In the editor, pick one from the palette panel’s Load… menu.
          </Text>
        }
      />
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
    <div
      className={cardVariants({
        padding: "sm",
        className: "flex h-full flex-col",
      })}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="truncate font-semibold">{palette.name}</h3>
        <Text
          as="span"
          size="xs"
          tone="muted"
          className="shrink-0 font-mono tabular-nums"
        >
          {colors.length} colours
        </Text>
      </div>
      <Text size="xs" tone="muted" className="truncate">
        {palette.author ? `by ${palette.author} · ` : ""}
        <a
          href={`https://lospec.com/palette-list/${palette.id}`}
          target="_blank"
          rel="noreferrer"
          className={linkVariants({ variant: "muted" })}
        >
          Lospec
        </a>
      </Text>
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
