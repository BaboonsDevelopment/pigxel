"use client";

import { cn } from "@pigxel/ui/lib/utils";
import { EditorSelect } from "@/features/editor/components/editor-select";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import type { SharePerson, ShareRole } from "../../../sharing";
import {
  ACTION_WIDTH,
  PILL,
  PILL_WIDTH,
  ROLE_OPTIONS,
  ROW,
} from "../constants";
import { ShareBadge } from "./share-badge";

const REMOVE = "remove";

export function PersonRow({
  person,
  onRoleChange,
  onRemove,
}: {
  person: SharePerson;
  onRoleChange: (role: ShareRole) => void;
  onRemove: () => void;
}) {
  const removeLabel = person.pending ? "Cancel invitation" : "Remove access";
  return (
    <li
      className={cn(
        ROW,
        "group transition-colors animate-in fade-in duration-150 hover:bg-secondary",
      )}
    >
      <ProfileAvatar
        name={person.name}
        url={person.avatarUrl}
        className="size-8 text-xs"
      />
      <span className="ml-1 flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium">{person.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          @{person.username}
        </span>
        {person.pending ? (
          <ShareBadge tone="invited">Invited</ShareBadge>
        ) : (
          person.viaLink && <ShareBadge tone="link">Link</ShareBadge>
        )}
      </span>
      <EditorSelect
        ariaLabel={`Access for ${person.name}`}
        value={person.role}
        options={[...ROLE_OPTIONS, { value: REMOVE, label: removeLabel }]}
        onChange={(value) =>
          value === REMOVE ? onRemove() : onRoleChange(value as ShareRole)
        }
        className={cn(PILL, PILL_WIDTH)}
      />
      <span className={cn(ACTION_WIDTH, "flex justify-end")}>
        <button
          type="button"
          aria-label={`${removeLabel}: ${person.name}`}
          title={removeLabel}
          onClick={onRemove}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-background hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
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
            <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />
          </svg>
        </button>
      </span>
    </li>
  );
}
