"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@pigxel/ui/components/badge";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { Notice } from "@pigxel/ui/components/notice";
import { SectionHeader } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";
import type {
  ArtAction,
  CommentAction,
  ReportAuthor,
  ReportedArt,
  ReportedComment,
} from "../../../types";
import { useReports } from "../../../use-asset-review";
import { CARD, PILL, REVIEW_GRID } from "../constants";
import { errorText } from "../helpers";

const ART_CONFIRMS: Partial<Record<ArtAction, string>> = {
  delete: "Delete this art for good?",
  ban: "Ban the author? Their arts go private and their comments are deleted.",
};

function useAction<A extends string>(run: (action: A) => Promise<void>) {
  const [confirming, setConfirming] = useState<A | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const act = async (action: A) => {
    setPending(true);
    setError("");
    try {
      await run(action);
    } catch (e) {
      setError(errorText(e));
      setPending(false);
    }
    setConfirming(null);
  };
  return { confirming, setConfirming, pending, error, act };
}

function AuthorLink({ author }: { author: ReportAuthor }) {
  if (!author.username) return <span>unknown author</span>;
  return (
    <Link
      href={`/u/${author.username}`}
      target="_blank"
      className="hover:text-foreground hover:underline"
    >
      @{author.username}
    </Link>
  );
}

function Confirm({
  text,
  pending,
  onCancel,
  onConfirm,
}: {
  text: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs">{text}</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className={cn(PILL, "h-8 flex-1 justify-center px-3")}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className="h-8 flex-1 cursor-pointer rounded-lg bg-destructive px-3 text-xs text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
        >
          {pending ? "Working…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}

function ArtCard({
  art,
  onAction,
}: {
  art: ReportedArt;
  onAction: (action: ArtAction) => Promise<void>;
}) {
  const { confirming, setConfirming, pending, error, act } =
    useAction<ArtAction>(onAction);
  const choose = (action: ArtAction) =>
    ART_CONFIRMS[action] ? setConfirming(action) : act(action);
  const reasons = Object.entries(art.reasons)
    .sort(([, a], [, b]) => b - a)
    .map(([reason, n]) => `${reason} ${n}`)
    .join(" · ");

  return (
    <article className={cn(CARD, "flex flex-col")}>
      <Link
        href={`/explore/${art.id}`}
        target="_blank"
        className="relative flex aspect-square items-center justify-center overflow-hidden bg-checker"
      >
        {art.thumbnail && (
          <PixelImage
            src={art.thumbnail}
            alt=""
            className="size-full object-contain"
          />
        )}
        <span className="pointer-events-none absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge tone="primary">
            {art.reports} report{art.reports === 1 ? "" : "s"}
          </Badge>
          {art.visibility !== "public" && <Badge tone="overlay">Private</Badge>}
          {art.author.banned && <Badge tone="overlay">Author banned</Badge>}
        </span>
      </Link>
      <div className="border-t py-1.5 pr-1.5 pl-3">
        <span className="block truncate text-sm font-semibold">{art.name}</span>
        <span className="block truncate font-mono text-[11px] text-muted-foreground">
          <AuthorLink author={art.author} /> · {reasons}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 border-t p-3">
        {art.details.length > 0 && (
          <ul className="max-h-24 space-y-1 overflow-y-auto text-xs text-muted-foreground italic">
            {art.details.map((detail, i) => (
              <li key={i}>“{detail}”</li>
            ))}
          </ul>
        )}
        <div className="mt-auto">
          {confirming ? (
            <Confirm
              text={ART_CONFIRMS[confirming]!}
              pending={pending}
              onCancel={() => setConfirming(null)}
              onConfirm={() => act(confirming)}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => choose("keep")}
                className={cn(PILL, "h-8 justify-center px-3")}
              >
                Keep
              </button>
              <button
                type="button"
                disabled={pending || art.visibility !== "public"}
                onClick={() => choose("unpublish")}
                className={cn(PILL, "h-8 justify-center px-3")}
              >
                Unpublish
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => choose("delete")}
                className={cn(PILL, "h-8 justify-center px-3 text-destructive")}
              >
                Delete
              </button>
              <button
                type="button"
                disabled={pending || art.author.banned}
                onClick={() => choose("ban")}
                className={cn(PILL, "h-8 justify-center px-3 text-destructive")}
              >
                Ban author
              </button>
            </div>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </article>
  );
}

function CommentRow({
  comment,
  onAction,
}: {
  comment: ReportedComment;
  onAction: (action: CommentAction) => Promise<void>;
}) {
  const { confirming, setConfirming, pending, error, act } =
    useAction<CommentAction>(onAction);

  return (
    <li className={cn(CARD, "flex flex-wrap items-start gap-x-6 gap-y-3 p-4")}>
      <div className="min-w-0 flex-1">
        <p className="text-sm break-words whitespace-pre-wrap">
          {comment.body}
        </p>
        <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
          <AuthorLink author={comment.author} /> on{" "}
          <Link
            href={`/explore/${comment.tileId}`}
            target="_blank"
            className="hover:text-foreground hover:underline"
          >
            {comment.tileName ?? "an art"}
          </Link>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Badge tone="primary">
          {comment.reports} report{comment.reports === 1 ? "" : "s"}
        </Badge>
        {confirming ? (
          <Confirm
            text="Delete this comment?"
            pending={pending}
            onCancel={() => setConfirming(null)}
            onConfirm={() => act("delete")}
          />
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => act("keep")}
              className={cn(PILL, "h-8 px-3")}
            >
              Keep
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming("delete")}
              className={cn(PILL, "h-8 px-3 text-destructive")}
            >
              Delete
            </button>
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </li>
  );
}

export function ReportList() {
  const { reports, resolveArt, resolveComment } = useReports();

  if (reports.isPending)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (reports.isError)
    return <Notice tone="error">{errorText(reports.error)}</Notice>;
  const { arts, comments } = reports.data;
  if (!arts.length && !comments.length)
    return <EmptyState title="No reports" description="Nothing to check." />;

  return (
    <>
      {arts.length > 0 && (
        <section aria-labelledby="reported-arts" className="mt-10 first:mt-0">
          <SectionHeader id="reported-arts" title={`Arts · ${arts.length}`} />
          <ul className={REVIEW_GRID}>
            {arts.map((art) => (
              <li key={art.id} className="flex [&>*]:flex-1">
                <ArtCard
                  art={art}
                  onAction={(action) => resolveArt(art.id, action)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      {comments.length > 0 && (
        <section
          aria-labelledby="reported-comments"
          className="mt-10 first:mt-0"
        >
          <SectionHeader
            id="reported-comments"
            title={`Comments · ${comments.length}`}
          />
          <ul className="flex flex-col gap-3">
            {comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                onAction={(action) => resolveComment(comment.id, action)}
              />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
