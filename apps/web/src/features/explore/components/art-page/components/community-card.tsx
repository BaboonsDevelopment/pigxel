"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { FormMessage } from "@pigxel/ui/components/field";
import { Heading } from "@pigxel/ui/components/typography";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import {
  deleteComment,
  editComment,
  reportComment,
  loadMoreComments,
  postComment,
} from "../../../actions";
import { scrollParent } from "@/lib/utils/scroll-parent";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import {
  COMMENT_MAX,
  commentAge,
  mapComment,
  removeComment,
  type ArtComment,
} from "../../../comments";
import { ProjectMenu } from "@/features/tiles/components/project-card/components/project-menu";
import { EmojiButton } from "./emoji-button";

export function CommunityCard({
  tileId,
  viewer,
  initial,
  total,
  onExpandedChange,
}: {
  tileId: string;
  viewer: { id: string; name: string; avatarUrl: string | null } | null;
  initial: ArtComment[];
  total: number;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const [comments, setComments] = useState(initial);
  const [count, setCount] = useState(total);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const loading = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = comments.length < count;

  const expand = (next: boolean) => {
    setAll(next);
    onExpandedChange(next);
  };

  useEffect(() => {
    const target = sentinel.current;
    if (!all || !hasMore || moreFailed || !target) return;
    const last = comments.at(-1);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || loading.current || !last) return;
        loading.current = true;
        loadMoreComments(tileId, last.createdAt)
          .then((more) => {
            if (!more.length) setCount(comments.length);
            setComments((list) => {
              const shown = new Set(list.map((c) => c.id));
              return [...list, ...more.filter((c) => !shown.has(c.id))];
            });
          })
          .catch(() => setMoreFailed(true))
          .finally(() => {
            loading.current = false;
          });
      },
      { root: scrollParent(target), rootMargin: "0px 0px 600px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [all, hasMore, moreFailed, comments, tileId]);
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

  const [replyTo, setReplyTo] = useState<{
    thread: string;
    text: string;
  } | null>(null);
  const [openThreads, setOpenThreads] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const openThread = (id: string) =>
    setOpenThreads((ids) => new Set(ids).add(id));

  const postReply = async (parentId: string, body: string) => {
    const result = await postComment(tileId, body, parentId);
    if (result.error || !result.comment)
      return result.error ?? "Couldn’t post that. Try again.";
    const reply = result.comment;
    setComments((list) =>
      mapComment(list, parentId, (c) => ({
        ...c,
        replies: [...c.replies, reply],
      })),
    );
    openThread(parentId);
    setReplyTo(null);
    return null;
  };

  const remove = async (comment: ArtComment) => {
    setError(null);
    const before = comments;
    const { parentId } = comment;
    if (parentId) setComments((list) => removeComment(list, comment.id));
    else {
      setComments((list) => list.filter((c) => c.id !== comment.id));
      setCount((n) => n - 1);
    }
    const result = await deleteComment(comment.id);
    if (result.error) {
      setComments(before);
      if (!parentId) setCount((n) => n + 1);
      setError(result.error);
    }
  };

  const insertEmoji = (emoji: string) => {
    const field = input.current;
    const start = field?.selectionStart ?? text.length;
    const end = field?.selectionEnd ?? text.length;
    const next = (text.slice(0, start) + emoji + text.slice(end)).slice(
      0,
      COMMENT_MAX,
    );
    setText(next);
    requestAnimationFrame(() => {
      const caret = Math.min(start + emoji.length, next.length);
      field?.focus();
      field?.setSelectionRange(caret, caret);
    });
  };

  const edit = async (comment: ArtComment, body: string) => {
    const result = await editComment(comment.id, body);
    if (result.error || !result.comment)
      return result.error ?? "Couldn’t save that. Try again.";
    const edited = result.comment;
    setComments((list) =>
      mapComment(list, edited.id, (c) => ({ ...edited, replies: c.replies })),
    );
    return null;
  };

  const report = async (comment: ArtComment) => {
    const confirmed = await confirmDialog({
      title: "Report this comment?",
      message: "We’ll take a look. The author won’t know who reported it.",
      confirmLabel: "Report",
    });
    if (!confirmed) return false;
    const result = await reportComment(comment.id);
    if (result.error) setError(result.error);
    return !result.error;
  };

  const reply = (comment: ArtComment) => {
    if (!viewer) return;
    const root = comment.parentId ?? comment.id;
    openThread(root);
    setReplyTo({
      thread: root,
      text:
        comment.parentId && comment.author.username
          ? `@${comment.author.username} `
          : "",
    });
  };

  const thread = (comment: ArtComment) => {
    const open = openThreads.has(comment.id);
    const { replies } = comment;
    const replying = replyTo?.thread === comment.id && viewer;
    const children = (
      <>
        {open || replies.length <= 2 ? (
          replies.map(item)
        ) : (
          <button
            type="button"
            onClick={() => openThread(comment.id)}
            className="w-fit cursor-pointer text-[10px] text-primary hover:underline"
          >
            View {replies.length} replies
          </button>
        )}
        {replying && (
          <ReplyForm
            key={replyTo.text}
            initial={replyTo.text}
            viewer={viewer}
            onPost={(body) => postReply(comment.id, body)}
            onCancel={() => setReplyTo(null)}
          />
        )}
      </>
    );
    return (
      <div key={comment.id} className="grid min-w-0 gap-2">
        {item(comment)}
        {(replies.length > 0 || replying) && (
          <div className="ml-3.5 grid gap-2 border-l border-[#f6dbe4] pl-5">
            {children}
          </div>
        )}
      </div>
    );
  };

  const item = (comment: ArtComment) => (
    <CommentItem
      key={comment.id}
      comment={comment}
      canReply={!!viewer}
      canEdit={!!viewer && viewer.id === comment.author.id}
      onEdit={(body) => edit(comment, body)}
      canDelete={!!viewer && viewer.id === comment.author.id}
      onReply={() => reply(comment)}
      onDelete={() => void remove(comment)}
      canReport={!!viewer && viewer.id !== comment.author.id}
      onReport={() => report(comment)}
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
        {(all || count > 2) && (
          <button
            type="button"
            onClick={() => expand(!all)}
            className="shrink-0 cursor-pointer text-[10px] text-primary hover:underline"
          >
            {all ? "Show less" : `View all ${count} comments →`}
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
          <div className="flex h-9 min-w-0 flex-1 items-center rounded-lg border bg-pastel-pink-soft/40 pr-1.5 transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
            <label className="flex h-full min-w-0 flex-1 items-center">
              <span className="sr-only">Comment</span>
              <input
                ref={input}
                value={text}
                maxLength={COMMENT_MAX}
                onChange={(e) => setText(e.target.value)}
                placeholder="Leave a little kindness…"
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground"
              />
            </label>
            <EmojiButton onPick={insertEmoji} />
          </div>
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
        <ul className="mt-4 grid gap-3">
          {(all ? comments : comments.slice(0, 2)).map((comment) => (
            <li key={comment.id}>{thread(comment)}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[11px] text-muted-foreground">
          No comments yet. Be the first to leave some love.
        </p>
      )}
      {all && hasMore && !moreFailed && (
        <div
          ref={sentinel}
          className="mt-3 text-center text-[10px] text-muted-foreground"
        >
          Loading more comments…
        </div>
      )}
      {moreFailed && (
        <p role="alert" className="mt-3 text-center text-[11px]">
          Couldn’t load more comments.{" "}
          <button
            type="button"
            onClick={() => setMoreFailed(false)}
            className="cursor-pointer text-primary hover:underline"
          >
            Try again
          </button>
        </p>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  canReply,
  canEdit,
  canDelete,
  onReply,
  onEdit,
  onDelete,
  canReport,
  onReport,
}: {
  comment: ArtComment;
  canReply: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onReply: () => void;
  onEdit: (body: string) => Promise<string | null>;
  onDelete: () => void;
  canReport: boolean;
  onReport: () => Promise<boolean>;
}) {
  const { author } = comment;
  const [reported, setReported] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const save = () => {
    if (draft === null) return;
    if (draft.trim() === comment.body) return setDraft(null);
    startSaving(async () => {
      const error = await onEdit(draft);
      setEditError(error);
      if (!error) setDraft(null);
    });
  };
  return (
    <div className="flex min-w-0 gap-2.5">
      <ProfileAvatar
        name={author.name}
        url={author.avatarUrl}
        className="size-7 bg-pastel-pink-soft text-[11px] text-primary"
      />
      <div className="min-w-0 flex-1">
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
            {comment.edited && " · edited"}
          </span>
        </p>
        {draft !== null ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="mt-1"
          >
            <textarea
              aria-label="Edit comment"
              autoFocus
              rows={2}
              value={draft}
              maxLength={COMMENT_MAX}
              disabled={saving}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setDraft(null);
                  setEditError(null);
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  save();
                }
              }}
              className="block w-full min-w-48 resize-none rounded-md border bg-pastel-pink-soft/40 px-2 py-1 text-[11px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            {editError && (
              <p role="alert" className="mt-0.5 text-[10px] text-destructive">
                {editError}
              </p>
            )}
            <p className="mt-1 flex gap-3 text-[10px]">
              <button
                type="submit"
                disabled={saving || !draft.trim()}
                className="cursor-pointer text-primary hover:underline disabled:cursor-default disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setDraft(null);
                  setEditError(null);
                }}
                className="cursor-pointer text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </p>
          </form>
        ) : (
          <p className="mt-0.5 text-[11px] break-words whitespace-pre-line">
            {comment.body}
          </p>
        )}
        {draft === null && canReply && (
          <p className="mt-0.5 text-[10px]">
            <button
              type="button"
              onClick={onReply}
              className="cursor-pointer text-primary hover:underline"
            >
              Reply
            </button>
            {reported && (
              <span className="ml-3 text-muted-foreground">
                Reported · thanks
              </span>
            )}
          </p>
        )}
      </div>
      {draft === null && canReport && !reported && (
        <button
          type="button"
          aria-label="Report comment"
          title="Report"
          onClick={() =>
            void onReport().then((done) => done && setReported(true))
          }
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <path d="M3.5 14V2.5M3.5 3h8l-1.8 3 1.8 3h-8" />
          </svg>
        </button>
      )}
      {draft === null && (canEdit || canDelete) && (
        <ProjectMenu
          label="Comment options"
          placement="down"
          icon={
            <svg aria-hidden="true" viewBox="0 0 20 4" className="w-3.5">
              <circle cx="2" cy="2" r="2" fill="currentColor" />
              <circle cx="10" cy="2" r="2" fill="currentColor" />
              <circle cx="18" cy="2" r="2" fill="currentColor" />
            </svg>
          }
          items={[
            ...(canEdit
              ? [{ label: "Edit", onSelect: () => setDraft(comment.body) }]
              : []),
            ...(canDelete
              ? [{ label: "Delete", destructive: true, onSelect: onDelete }]
              : []),
          ]}
        />
      )}
    </div>
  );
}

function ReplyForm({
  initial,
  viewer,
  onPost,
  onCancel,
}: {
  initial: string;
  viewer: { name: string; avatarUrl: string | null };
  onPost: (body: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [posting, startPosting] = useTransition();
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = field.current;
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }, []);

  const post = () =>
    startPosting(async () => {
      const result = await onPost(text);
      setError(result);
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) post();
      }}
      className="flex items-center gap-2"
    >
      <ProfileAvatar
        name={viewer.name}
        url={viewer.avatarUrl}
        className="size-6 text-[10px]"
      />
      <div className="min-w-0 flex-1">
        <input
          ref={field}
          aria-label="Reply"
          value={text}
          maxLength={COMMENT_MAX}
          disabled={posting}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          placeholder="Write a reply…"
          className="h-8 w-full rounded-lg border bg-pastel-pink-soft/40 px-3 text-[11px] outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
        {error && (
          <p role="alert" className="mt-0.5 text-[10px] text-destructive">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={posting || !text.trim()}
        className="h-8 shrink-0 cursor-pointer rounded-lg bg-pastel-pink px-3 text-[11px] text-primary-soft-foreground transition-colors hover:bg-primary-soft disabled:cursor-default disabled:opacity-60"
      >
        {posting ? "Posting…" : "Reply"}
      </button>
      <button
        type="button"
        disabled={posting}
        onClick={onCancel}
        className="h-8 shrink-0 cursor-pointer px-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </form>
  );
}
