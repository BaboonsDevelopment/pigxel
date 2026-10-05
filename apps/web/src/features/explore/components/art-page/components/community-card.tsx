"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Dialog, DialogBody, DialogHeader } from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { Heading } from "@pigxel/ui/components/typography";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { deleteComment, postComment } from "../../../actions";
import { COMMENT_MAX, commentAge, type ArtComment } from "../../../comments";

export function CommunityCard({
  tileId,
  ownerId,
  viewer,
  initial,
  total,
}: {
  tileId: string;
  ownerId: string;
  viewer: { id: string; name: string; avatarUrl: string | null } | null;
  initial: ArtComment[];
  total: number;
}) {
  const [comments, setComments] = useState(initial);
  const [count, setCount] = useState(total);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [posting, startPosting] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const post = () =>
    startPosting(async () => {
      setError(null);
      const result = await postComment(tileId, text);
      if (result.error || !result.comment)
        return setError(result.error ?? "Couldn’t post that. Try again.");
      setComments((list) => [result.comment!, ...list]);
      setCount((n) => n + 1);
      setText("");
    });

  const remove = async (comment: ArtComment) => {
    setError(null);
    const before = comments;
    setComments((list) => list.filter((c) => c.id !== comment.id));
    setCount((n) => n - 1);
    const result = await deleteComment(comment.id);
    if (result.error) {
      setComments(before);
      setCount((n) => n + 1);
      setError(result.error);
    }
  };

  const reply = (comment: ArtComment) => {
    if (!viewer || !comment.author.username) return;
    setAll(false);
    setText(`@${comment.author.username} `);
    input.current?.focus();
  };

  const item = (comment: ArtComment) => (
    <CommentItem
      key={comment.id}
      comment={comment}
      canReply={!!viewer}
      canDelete={
        !!viewer && (viewer.id === comment.author.id || viewer.id === ownerId)
      }
      onReply={() => reply(comment)}
      onDelete={() => void remove(comment)}
    />
  );

  return (
    <section
      aria-labelledby="community-heading"
      className="rounded-2xl border bg-background p-5 shadow-[0_1px_2px_rgb(59_42_51/0.06)]"
    >
      <div className="flex items-center justify-between gap-3">
        <Heading
          as="h2"
          id="community-heading"
          className="text-lg font-semibold"
        >
          A little love from the community
        </Heading>
        {count > 0 && (
          <button
            type="button"
            onClick={() => setAll(true)}
            className="shrink-0 cursor-pointer text-[10px] text-primary hover:underline"
          >
            View all {count} comments →
          </button>
        )}
      </div>
      {viewer ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) post();
          }}
          className="mt-3 flex items-center gap-2.5"
        >
          <ProfileAvatar
            name={viewer.name}
            url={viewer.avatarUrl}
            className="size-8 text-xs"
          />
          <label className="flex h-9 min-w-0 flex-1 items-center rounded-lg border bg-pastel-pink-soft/40 pr-3 transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
            <span className="sr-only">Comment</span>
            <input
              ref={input}
              value={text}
              maxLength={COMMENT_MAX}
              onChange={(e) => setText(e.target.value)}
              placeholder="Leave a little kindness…"
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground"
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              className="size-4 shrink-0 text-muted-foreground"
            >
              <circle cx="8" cy="8" r="6.2" />
              <path d="M5.5 9.5c.6.9 1.5 1.4 2.5 1.4s1.9-.5 2.5-1.4" />
              <path d="M6 6.2h.01M10 6.2h.01" strokeWidth="1.8" />
            </svg>
          </label>
          <button
            type="submit"
            disabled={posting || !text.trim()}
            className="h-9 shrink-0 cursor-pointer rounded-lg bg-pastel-pink px-4 text-xs text-primary-soft-foreground transition-colors hover:bg-primary-soft disabled:cursor-default disabled:opacity-60"
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>{" "}
          to leave a little kindness.
        </p>
      )}
      {error && (
        <FormMessage tone="error" className="mt-2">
          {error}
        </FormMessage>
      )}
      {comments.length ? (
        <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {comments.slice(0, 2).map(item)}
        </ul>
      ) : (
        <p className="mt-4 text-[11px] text-muted-foreground">
          No comments yet. Be the first to leave some love.
        </p>
      )}
      {all && (
        <Dialog onClose={() => setAll(false)} size="md" portal>
          <DialogHeader title={`Comments · ${count}`} />
          <DialogBody>
            <ul className="grid gap-4">{comments.map(item)}</ul>
          </DialogBody>
        </Dialog>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  canReply,
  canDelete,
  onReply,
  onDelete,
}: {
  comment: ArtComment;
  canReply: boolean;
  canDelete: boolean;
  onReply: () => void;
  onDelete: () => void;
}) {
  const { author } = comment;
  return (
    <li className="flex min-w-0 gap-2.5">
      <ProfileAvatar
        name={author.name}
        url={author.avatarUrl}
        className="size-7 bg-pastel-pink-soft text-[11px] text-primary"
      />
      <div className="min-w-0">
        <p className="flex items-baseline gap-1.5">
          {author.username ? (
            <Link
              href={`/u/${author.username}`}
              className="truncate text-xs font-semibold hover:text-primary"
            >
              {author.username}
            </Link>
          ) : (
            <span className="truncate text-xs font-semibold">
              {author.name}
            </span>
          )}
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {commentAge(comment.createdAt)}
          </span>
        </p>
        <p className="mt-0.5 text-[11px] break-words whitespace-pre-line">
          {comment.body}
        </p>
        {(canReply || canDelete) && (
          <p className="mt-0.5 flex gap-3 text-[10px]">
            {canReply && author.username && (
              <button
                type="button"
                onClick={onReply}
                className="cursor-pointer text-primary hover:underline"
              >
                Reply
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="cursor-pointer text-muted-foreground hover:text-destructive"
              >
                Delete
              </button>
            )}
          </p>
        )}
      </div>
    </li>
  );
}
