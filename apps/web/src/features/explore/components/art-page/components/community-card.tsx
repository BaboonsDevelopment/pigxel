"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FormMessage } from "@pigxel/ui/components/field";
import { cn } from "@pigxel/ui/lib/utils";
import { madimiOne } from "@/lib/fonts/madimi";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import {
  deleteComment,
  editComment,
  loadMoreComments,
  postComment,
  reportComment,
  setCommentLiked,
} from "../../../actions";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import {
  COMMENT_MAX,
  COMMENT_SORTS,
  commentAge,
  mapComment,
  removeComment,
  type ArtComment,
  type CommentSort,
} from "../../../comments";
import { ProjectMenu } from "@/features/tiles/components/project-card/components/project-menu";
import { EmojiButton } from "./emoji-button";
import { useDismiss } from "../../explore-header/components/menu-button";
import { CheckIcon, ChevronIcon } from "../../explore-header/components/icons";

type Viewer = { id: string; name: string; avatarUrl: string | null };

const FIELD =
  "rounded-xl border bg-background p-2.5 transition-colors focus-within:border-[#8c3a57]";

const SEND =
  "h-8 shrink-0 cursor-pointer rounded-lg bg-primary px-4 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-default disabled:bg-muted disabled:text-muted-foreground";

const DOTS = (
  <svg aria-hidden="true" viewBox="0 0 20 4" className="w-3.5">
    <circle cx="2" cy="2" r="2" fill="currentColor" />
    <circle cx="10" cy="2" r="2" fill="currentColor" />
    <circle cx="18" cy="2" r="2" fill="currentColor" />
  </svg>
);

function insertAtCaret(
  field: HTMLTextAreaElement | null,
  text: string,
  insert: string,
  apply: (next: string) => void,
) {
  const start = field?.selectionStart ?? text.length;
  const end = field?.selectionEnd ?? text.length;
  const next = (text.slice(0, start) + insert + text.slice(end)).slice(
    0,
    COMMENT_MAX,
  );
  apply(next);
  requestAnimationFrame(() => {
    const caret = Math.min(start + insert.length, next.length);
    field?.focus();
    field?.setSelectionRange(caret, caret);
  });
}

function SortMenu({
  value,
  onChange,
}: {
  value: CommentSort;
  onChange: (value: CommentSort) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useDismiss(open, () => setOpen(false));
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`Sort comments: ${value}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-xs transition-colors hover:bg-muted aria-expanded:border-primary"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="size-3.5"
        >
          <path d="m10 2.8 2.2 4.5 4.9.7-3.6 3.5.9 4.9L10 14.1l-4.4 2.3.9-4.9L2.9 8l4.9-.7Z" />
        </svg>
        {COMMENT_SORTS.find((s) => s.value === value)!.label}
        <ChevronIcon />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute top-full right-0 z-30 mt-2 min-w-36 rounded-xl border bg-popover p-1.5 shadow-lg animate-in fade-in slide-in-from-top-1"
        >
          {COMMENT_SORTS.map((o) => (
            <li key={o.value} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={o.value === value}
                onClick={() => {
                  setOpen(false);
                  onChange(o.value);
                }}
                className={cn(
                  "flex h-9 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-xs transition-colors hover:bg-muted",
                  o.value === value && "bg-pastel-pink-soft",
                )}
              >
                <span className="flex-1">{o.label}</span>
                {o.value === value && (
                  <span className="text-primary">
                    <CheckIcon />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CommunityCard({
  tileId,
  artistId,
  viewer,
  initial,
  total,
  onCountChange,
}: {
  tileId: string;
  artistId: string;
  viewer: Viewer | null;
  initial: ArtComment[];
  total: number;
  onCountChange: (count: number) => void;
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initial);
  const [count, setCount] = useState(total);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<CommentSort>("newest");
  const [sorting, setSorting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const version = useRef(0);
  const hasMore = comments.length < count;
  const [posting, startPosting] = useTransition();
  const input = useRef<HTMLTextAreaElement>(null);
  const [replyTo, setReplyTo] = useState<{
    thread: string;
    to: string | null;
    text: string;
  } | null>(null);
  const [openThreads, setOpenThreads] = useState<ReadonlySet<string>>(
    new Set(),
  );

  useEffect(() => onCountChange(count), [count, onCountChange]);

  const changeSort = (next: CommentSort) => {
    if (next === sort) return;
    const current = ++version.current;
    setSort(next);
    setSorting(true);
    setError(null);
    loadMoreComments(tileId, 0, next)
      .then((list) => {
        if (current === version.current) setComments(list);
      })
      .catch(() => {
        if (current === version.current)
          setError("Couldn’t sort comments. Try again.");
      })
      .finally(() => {
        if (current === version.current) setSorting(false);
      });
  };

  const loadMore = () => {
    if (loadingMore || sorting) return;
    const current = version.current;
    setLoadingMore(true);
    setError(null);
    loadMoreComments(tileId, comments.length, sort)
      .then((more) => {
        if (current !== version.current) return;
        if (!more.length) setCount(comments.length);
        setComments((list) => {
          const shown = new Set(list.map((c) => c.id));
          return [...list, ...more.filter((c) => !shown.has(c.id))];
        });
      })
      .catch(() => {
        if (current === version.current)
          setError("Couldn’t load more comments. Try again.");
      })
      .finally(() => setLoadingMore(false));
  };

  const post = () =>
    startPosting(async () => {
      setError(null);
      const result = await postComment(tileId, text);
      if (result.error || !result.comment)
        return setError(result.error ?? "Couldn’t post that. Try again.");
      const added = result.comment;
      if (sort !== "oldest") setComments((list) => [added, ...list]);
      else if (!hasMore) setComments((list) => [...list, added]);
      setCount((n) => n + 1);
      setText("");
    });

  const openThread = (id: string) =>
    setOpenThreads((threads) => new Set(threads).add(id));
  const closeThread = (id: string) =>
    setOpenThreads((threads) => {
      const next = new Set(threads);
      next.delete(id);
      return next;
    });

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

  const edit = async (comment: ArtComment, body: string) => {
    const result = await editComment(comment.id, body);
    if (result.error || !result.comment)
      return result.error ?? "Couldn’t save that. Try again.";
    const edited = result.comment;
    setComments((list) =>
      mapComment(list, edited.id, (c) => ({
        ...edited,
        likes: c.likes,
        liked: c.liked,
        replies: c.replies,
      })),
    );
    return null;
  };

  const like = async (comment: ArtComment) => {
    if (!viewer) return router.push("/login");
    const next = !comment.liked;
    const flip = (liked: boolean) =>
      setComments((list) =>
        mapComment(list, comment.id, (c) =>
          c.liked === liked
            ? c
            : { ...c, liked, likes: Math.max(0, c.likes + (liked ? 1 : -1)) },
        ),
      );
    flip(next);
    const result = await setCommentLiked(comment.id, next);
    if (result.error) {
      flip(!next);
      setError(result.error);
    }
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
    if (!viewer) return router.push("/login");
    const root = comment.parentId ?? comment.id;
    openThread(root);
    setReplyTo({
      thread: root,
      to: comment.author.username,
      text:
        comment.parentId && comment.author.username
          ? `@${comment.author.username} `
          : "",
    });
  };

  const item = (comment: ArtComment) => (
    <CommentItem
      key={comment.id}
      comment={comment}
      artist={comment.author.id === artistId}
      own={!!viewer && viewer.id === comment.author.id}
      signedIn={!!viewer}
      onLike={() => void like(comment)}
      onReply={() => reply(comment)}
      onEdit={(body) => edit(comment, body)}
      onDelete={() => void remove(comment)}
      onReport={() => report(comment)}
    />
  );

  const thread = (comment: ArtComment) => {
    const open = openThreads.has(comment.id);
    const { replies } = comment;
    const replying = replyTo?.thread === comment.id && viewer;
    return (
      <div className="grid min-w-0 gap-3">
        {item(comment)}
        {(replies.length > 0 || replying) && (
          <div className="ml-3.5 grid gap-3 border-l-2 border-[#f3d3de] pl-4">
            {open || replies.length <= 2 ? (
              <>
                {replies.map(item)}
                {replies.length > 2 && (
                  <button
                    type="button"
                    onClick={() => closeThread(comment.id)}
                    className="w-fit cursor-pointer text-[10px] text-primary hover:underline"
                  >
                    Hide replies
                  </button>
                )}
              </>
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
                key={`${replyTo.to}:${replyTo.text}`}
                to={replyTo.to}
                initial={replyTo.text}
                viewer={viewer}
                onPost={(body) => postReply(comment.id, body)}
                onCancel={() => setReplyTo(null)}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  const active = focused || !!text;

  return (
    <section aria-labelledby="community-heading" className="border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="community-heading"
          className={cn(
            madimiOne.className,
            "text-xl tracking-[0.02em] text-[#4a1f35]",
          )}
        >
          Comments ({count})
        </h2>
        <SortMenu value={sort} onChange={changeSort} />
      </div>
      {viewer ? (
        <div
          className={cn(
            "mt-3 rounded-2xl transition-colors",
            active && "bg-[#fdeef3] p-3",
          )}
        >
          {active && (
            <p
              className={cn(
                madimiOne.className,
                "mb-2 text-base text-[#4a1f35]",
              )}
            >
              Join the conversation
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) post();
            }}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                setFocused(false);
            }}
            className="flex items-start gap-2.5"
          >
            <ProfileAvatar
              name={viewer.name}
              url={viewer.avatarUrl}
              className="size-8 text-xs"
            />
            <div className={cn(FIELD, "min-w-0 flex-1")}>
              <label className="block">
                <span className="sr-only">Comment</span>
                <textarea
                  ref={input}
                  rows={2}
                  value={text}
                  maxLength={COMMENT_MAX}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (text.trim() && !posting) post();
                    }
                  }}
                  placeholder="Leave a comment…"
                  className="block w-full resize-none bg-transparent px-1 text-xs outline-none placeholder:text-muted-foreground"
                />
              </label>
              <div className="mt-1 flex items-center justify-between">
                <EmojiButton
                  onPick={(emoji) =>
                    insertAtCaret(input.current, text, emoji, setText)
                  }
                />
                <button
                  type="submit"
                  disabled={posting || !text.trim()}
                  className={SEND}
                >
                  {posting ? "Posting…" : "Post"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>{" "}
          to leave a comment.
        </p>
      )}
      {error && (
        <FormMessage tone="error" className="mt-2">
          {error}
        </FormMessage>
      )}
      {comments.length ? (
        <ul
          aria-busy={sorting}
          className={cn("mt-2 divide-y", sorting && "opacity-60")}
        >
          {comments.map((comment) => (
            <li key={comment.id} className="py-4">
              {thread(comment)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[11px] text-muted-foreground">
          No comments yet. Be the first to leave some love.
        </p>
      )}
      {hasMore && (
        <div className="mt-1 flex justify-center">
          <button
            type="button"
            disabled={loadingMore || sorting}
            onClick={loadMore}
            className="h-9 cursor-pointer rounded-lg border bg-background px-6 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "Load more comments"}
          </button>
        </div>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  artist,
  own,
  signedIn,
  onLike,
  onReply,
  onEdit,
  onDelete,
  onReport,
}: {
  comment: ArtComment;
  artist: boolean;
  own: boolean;
  signedIn: boolean;
  onLike: () => void;
  onReply: () => void;
  onEdit: (body: string) => Promise<string | null>;
  onDelete: () => void;
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

  const menu = own
    ? [
        { label: "Edit", onSelect: () => setDraft(comment.body) },
        { label: "Delete", destructive: true, onSelect: onDelete },
      ]
    : signedIn && !reported
      ? [
          {
            label: "Report",
            destructive: true,
            onSelect: () =>
              void onReport().then((done) => done && setReported(true)),
          },
        ]
      : [];

  return (
    <div className="flex min-w-0 gap-2.5">
      <ProfileAvatar
        name={author.name}
        url={author.avatarUrl}
        className="size-7 bg-pastel-pink-soft text-[11px] text-primary"
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5">
          {author.username ? (
            <Link
              href={`/u/${author.username}`}
              className="truncate text-[11px] font-semibold hover:text-primary"
            >
              {author.username}
            </Link>
          ) : (
            <span className="truncate text-[11px] font-semibold">
              {author.name}
            </span>
          )}
          {artist && (
            <span className="shrink-0 rounded bg-pastel-pink-soft px-1.5 text-[9px] leading-4 text-primary">
              Artist
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
              className="block w-full min-w-48 resize-none rounded-lg border bg-background px-2 py-1 text-[11px] outline-none focus:border-[#8c3a57]"
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
        {draft === null && (
          <p className="mt-1 flex items-center gap-4 text-[10px]">
            <button
              type="button"
              aria-pressed={comment.liked}
              aria-label={`${comment.liked ? "Unlike" : "Like"} comment`}
              onClick={onLike}
              className={cn(
                "flex cursor-pointer items-center gap-1 text-muted-foreground transition-colors hover:text-primary",
                comment.liked && "text-primary",
              )}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill={comment.liked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
                className="size-3"
              >
                <path d="M8 13.5S2.5 10.3 2.5 6.4A3 3 0 0 1 8 4.8a3 3 0 0 1 5.5 1.6c0 3.9-5.5 7.1-5.5 7.1Z" />
              </svg>
              <span className="tabular-nums">{comment.likes}</span>
            </button>
            <button
              type="button"
              onClick={onReply}
              className="cursor-pointer text-primary hover:underline"
            >
              Reply
            </button>
            {reported && (
              <span className="text-muted-foreground">Reported · thanks</span>
            )}
          </p>
        )}
      </div>
      {draft === null && menu.length > 0 && (
        <ProjectMenu
          label="Comment options"
          placement="down"
          icon={DOTS}
          items={menu}
        />
      )}
    </div>
  );
}

function ReplyForm({
  to,
  initial,
  viewer,
  onPost,
  onCancel,
}: {
  to: string | null;
  initial: string;
  viewer: { name: string; avatarUrl: string | null };
  onPost: (body: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [posting, startPosting] = useTransition();
  const field = useRef<HTMLTextAreaElement>(null);

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
      className="flex items-start gap-2.5"
    >
      <ProfileAvatar
        name={viewer.name}
        url={viewer.avatarUrl}
        className="size-7 text-[10px]"
      />
      <div className={cn(FIELD, "min-w-0 flex-1 border-[#8c3a57]")}>
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="truncate text-[10px] text-muted-foreground">
            {to ? `Replying to @${to}` : "Replying"}
          </span>
          <button
            type="button"
            aria-label="Cancel reply"
            disabled={posting}
            onClick={onCancel}
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="size-3"
            >
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <textarea
          ref={field}
          aria-label="Reply"
          rows={2}
          value={text}
          maxLength={COMMENT_MAX}
          disabled={posting}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim() && !posting) post();
            }
          }}
          placeholder="Write a reply…"
          className="mt-1 block w-full resize-none bg-transparent px-1 text-[11px] outline-none placeholder:text-muted-foreground"
        />
        {error && (
          <p role="alert" className="px-1 text-[10px] text-destructive">
            {error}
          </p>
        )}
        <div className="mt-1 flex items-center justify-between">
          <EmojiButton
            onPick={(emoji) =>
              insertAtCaret(field.current, text, emoji, setText)
            }
          />
          <button
            type="submit"
            disabled={posting || !text.trim()}
            className={SEND}
          >
            {posting ? "Posting…" : "Post reply"}
          </button>
        </div>
      </div>
    </form>
  );
}
