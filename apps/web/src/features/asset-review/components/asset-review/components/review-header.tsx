"use client";

import Link from "next/link";
import { Button } from "@pigxel/ui/components/button";
import { Heading } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { leaveReview } from "../../../use-asset-review";
import {
  BACKGROUNDS,
  FILTERS,
  PILL,
  VIEWS,
  type Filter,
  type View,
} from "../constants";
import { reviewHref } from "../helpers";

function BackgroundPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Preview background"
      className="flex h-10 items-center gap-1.5 rounded-lg border bg-background px-2"
    >
      {BACKGROUNDS.map((b) => (
        <button
          key={b.id}
          type="button"
          title={b.label}
          aria-label={b.label}
          aria-pressed={value === b.id}
          onClick={() => onChange(b.id)}
          className={cn(
            "size-6 cursor-pointer rounded-md border transition-shadow aria-pressed:ring-2 aria-pressed:ring-primary aria-pressed:ring-offset-1",
            b.className,
          )}
        />
      ))}
    </div>
  );
}

export function ReviewHeader({
  view,
  filter,
  counts,
  background,
  onBackground,
  publishable,
  publishing,
  onPublish,
}: {
  view: View;
  filter: Filter;
  counts: Record<Filter, number>;
  background: string;
  onBackground: (id: string) => void;
  publishable: number;
  publishing: boolean;
  onPublish: () => void;
}) {
  return (
    <header className="@container mb-6">
      <div className="flex flex-col gap-4 @min-[1000px]:flex-row @min-[1000px]:items-end @min-[1000px]:justify-between @min-[1000px]:gap-6">
        <div className="min-w-0">
          <Heading
            as="h1"
            className="text-[2.5rem] leading-[1.1] font-semibold"
          >
            Asset review
          </Heading>
          <p className="mt-1 text-xs text-muted-foreground">
            Approve, fix or drop what Claude drew, then publish it to Assets ✨
          </p>
          <nav
            aria-label="Show"
            className="mt-6 flex min-h-10 flex-wrap items-center gap-2"
          >
            {VIEWS.map((v) => (
              <Link
                key={v.id}
                href={reviewHref(v.id)}
                scroll={false}
                aria-current={v.id === view ? "page" : undefined}
                className={PILL}
              >
                {v.label}
              </Link>
            ))}
            {view === "review" && (
              <>
                <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
                {FILTERS.map((f) => (
                  <Link
                    key={f.id}
                    href={reviewHref("review", f.id)}
                    scroll={false}
                    aria-current={f.id === filter ? "page" : undefined}
                    className={PILL}
                  >
                    {f.label}
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {counts[f.id]}
                    </span>
                  </Link>
                ))}
              </>
            )}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BackgroundPicker value={background} onChange={onBackground} />
          <Button
            type="button"
            className="h-10"
            disabled={!publishable || publishing}
            onClick={onPublish}
          >
            {publishing
              ? "Publishing…"
              : publishable
                ? `Publish ${publishable}`
                : "Nothing to publish"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-10"
            onClick={leaveReview}
          >
            Lock
          </Button>
        </div>
      </div>
    </header>
  );
}
