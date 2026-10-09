"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { EditorSelect } from "@/features/editor/components/editor-select";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { searchPeople } from "../../../actions";
import type { PersonMatch, SharePerson, ShareRole } from "../../../sharing";
import { PILL, ROLE_OPTIONS } from "../constants";

const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 4.5;
const DEBOUNCE = 200;

const handleOf = (text: string) => text.trim().replace(/^@/, "").toLowerCase();

export function InviteForm({
  people,
  inviting,
  onInvite,
}: {
  people: SharePerson[];
  inviting: boolean;
  onInvite: (username: string, role: ShareRole) => Promise<boolean>;
}) {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<ShareRole>("viewer");
  const [searched, setSearched] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [place, setPlace] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const [container, setContainer] = useState<Element | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    const timer = setTimeout(() => setSearched(handleOf(username)), DEBOUNCE);
    return () => clearTimeout(timer);
  }, [username]);

  const matches = useQuery({
    queryKey: ["people-search", searched],
    queryFn: () => searchPeople(searched),
    enabled: searched.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const found = searched
    ? (matches.data ?? []).filter(
        (match) => !people.some((person) => person.username === match.username),
      )
    : [];
  const shown = open && username.trim() !== "" && found.length > 0;

  const measure = () => {
    const rect = field.current?.getBoundingClientRect();
    if (!rect) return;
    setContainer(field.current?.closest("dialog") ?? document.body);
    setPlace({ left: rect.left, top: rect.bottom + 4, width: rect.width });
  };

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      const target = event.target as Node;
      if (!field.current?.contains(target) && !list.current?.contains(target))
        setOpen(false);
    };
    const hide = (event: Event) => {
      if (!list.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open]);

  const accessOf = (handle: string) =>
    people.find((person) => person.username === handle);

  const statusOf = (person: SharePerson) =>
    person.pending
      ? `@${person.username} is already invited.`
      : `@${person.username} already has access.`;

  const choose = (match: PersonMatch) => {
    setOpen(false);
    setNotice(null);
    setUsername(match.username);
    field.current?.focus();
  };

  const invite = async () => {
    const handle = handleOf(username);
    if (!handle || inviting) return;
    setOpen(false);
    const existing = accessOf(handle);
    if (existing) {
      setNotice(statusOf(existing));
      return;
    }
    setNotice(null);
    if (await onInvite(handle, role)) setUsername("");
  };

  return (
    <div className="grid gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (shown && found[active]) choose(found[active]);
          else void invite();
        }}
        className="flex items-center gap-2"
      >
        <Input
          ref={field}
          role="combobox"
          aria-label="Username"
          aria-autocomplete="list"
          aria-expanded={shown}
          aria-controls={shown ? listId : undefined}
          placeholder="Invite by username or name"
          autoComplete="off"
          spellCheck={false}
          maxLength={50}
          className="h-9"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setNotice(null);
            setActive(0);
            measure();
            setOpen(true);
          }}
          onFocus={() => {
            measure();
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!shown) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const step = e.key === "ArrowDown" ? 1 : -1;
              const next = (active + step + found.length) % found.length;
              setActive(next);
              list.current?.children[next]?.scrollIntoView({
                block: "nearest",
              });
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }
          }}
        />
        <EditorSelect
          ariaLabel="Role"
          value={role}
          options={ROLE_OPTIONS}
          onChange={(value) => setRole(value as ShareRole)}
          className={cn(PILL, "w-24")}
        />
        <Button type="submit" disabled={inviting || !username.trim()}>
          {inviting ? "Inviting…" : "Invite"}
        </Button>
      </form>
      {notice && (
        <FormMessage className="animate-in fade-in duration-150">
          {notice}
        </FormMessage>
      )}
      {shown &&
        place &&
        container &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-label="People"
            style={{
              left: place.left,
              top: place.top,
              width: place.width,
              maxHeight: ROW_HEIGHT * VISIBLE_ROWS + 8,
            }}
            className="fixed z-[100] overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {found.map((match, index) => (
              <li
                key={match.id}
                role="option"
                aria-selected={index === active}
                onPointerEnter={() => setActive(index)}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(match)}
                style={{ height: ROW_HEIGHT }}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-md px-2",
                  index === active && "bg-secondary",
                )}
              >
                <ProfileAvatar
                  name={match.name}
                  url={match.avatarUrl}
                  className="size-7 text-xs"
                />
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {match.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    @{match.username}
                  </span>
                </span>
              </li>
            ))}
          </ul>,
          container,
        )}
    </div>
  );
}
