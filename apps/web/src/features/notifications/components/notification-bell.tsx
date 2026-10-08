"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { openNotifications } from "../actions";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import type { ActivityKind, AppNotification } from "../server";
import { BellIcon } from "@/components/ui/icons";

export function NotificationBell({
  unread: initialUnread,
}: {
  unread: number;
}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setFailed(false);
    startTransition(async () => {
      try {
        setItems(await openNotifications());
        setUnread(0);
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={toggle}
        className="relative flex size-10 items-center justify-center rounded-full border bg-white/80 text-foreground shadow-sm transition-colors hover:bg-white"
      >
        <BellIcon />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ring-2 ring-canvas"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <section
          id={panelId}
          aria-label="Notifications"
          className="absolute top-full right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border bg-popover text-popover-foreground shadow-xl"
        >
          <h2 className="border-b px-4 py-3 font-display text-lg">
            Notifications
          </h2>
          <div className="max-h-96 overflow-y-auto p-2">
            {failed ? (
              <Message>Couldn’t load notifications. Try again.</Message>
            ) : items === null ? (
              <Message>Loading…</Message>
            ) : items.length === 0 ? (
              <Message>
                Nothing yet. When someone follows you or likes, comments on,
                saves, remixes or downloads your art, you’ll see it here.
              </Message>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={hrefOf(item)}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary",
                        item.unread && "bg-primary-soft/35",
                      )}
                    >
                      {item.kind !== "art_rejected" ? (
                        <ProfileAvatar name={item.name} url={item.avatarUrl} />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-4"
                          >
                            <path d="M8 2.5 14 13H2Z" />
                            <path d="M8 6.5v3M8 11.3v.2" />
                          </svg>
                        </span>
                      )}
                      <span className="min-w-0 flex-1 text-sm">
                        {item.kind === "follow" ? (
                          <>
                            <span className="font-semibold">{item.name}</span>{" "}
                            started following you
                          </>
                        ) : item.kind !== "art_rejected" ? (
                          <>
                            <span className="font-semibold">{item.name}</span>{" "}
                            {ACTIVITY[item.kind]} “{item.tileName}”
                            {item.detail && (
                              <span className="line-clamp-2 text-muted-foreground">
                                {item.detail}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="block font-semibold">
                              “{item.tileName}” wasn’t published
                            </span>
                            It didn’t pass our content check, so only you can
                            see it. Explore doesn’t allow adult content.
                          </>
                        )}
                        <span className="block text-xs text-muted-foreground">
                          {item.ago}
                        </span>
                      </span>
                      {item.unread && (
                        <span
                          aria-label="New"
                          className="size-2 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

const ACTIVITY: Record<ActivityKind, string> = {
  like: "liked",
  comment: "commented on",
  save: "saved",
  remix: "remixed",
  download: "downloaded",
};

function hrefOf(item: AppNotification) {
  if (item.kind === "follow") return `/u/${item.username}`;
  if (item.kind === "art_rejected") return "/tiles";
  return item.tileId ? `/explore/${item.tileId}` : `/u/${item.username}`;
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
