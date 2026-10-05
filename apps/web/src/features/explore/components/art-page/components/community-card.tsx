"use client";

import Link from "next/link";
import { useState } from "react";
import { Heading } from "@pigxel/ui/components/typography";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";

export function CommunityCard({
  viewer,
}: {
  viewer: { name: string; avatarUrl: string | null } | null;
}) {
  const [text, setText] = useState("");
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
        <span className="shrink-0 text-[10px] text-primary">
          View all comments →
        </span>
      </div>
      {viewer ? (
        <form
          onSubmit={(e) => e.preventDefault()}
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
              value={text}
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
            disabled
            title="Comments are coming soon"
            className="h-9 shrink-0 rounded-lg bg-pastel-pink px-4 text-xs text-primary-soft-foreground disabled:opacity-70"
          >
            Post
          </button>
        </form>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>{" "}
          to leave a little kindness.
        </p>
      )}
      <p className="mt-4 text-[11px] text-muted-foreground">
        No comments yet. Be the first to leave some love.
      </p>
    </section>
  );
}
