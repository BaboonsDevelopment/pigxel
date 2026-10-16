"use client";

import Link from "next/link";
import { useRef, type ReactNode, type RefObject } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { PIGXEL_EXTENSION } from "@/lib/pigxel-file/format";
import { IMAGE_FILE_TYPES } from "@/lib/pigxel-file/import-image";
import type { ActionId } from "../keymap";
import type { TileFile } from "../use-tile-file";
import { Menu } from "./menu/menu";
import { TokensButton } from "@/features/ai/components/tokens-button/tokens-button";
import type { MenuItem, MenuSections } from "./menu/constants";
import type { SpriteApi } from "../pixel-canvas/use-sprite";

export function EditorHeader({
  hidden,
  file,
  fileInput,
  sprite,
  onOpenCloud,
  recent,
  onExport,
  onPublish,
  onPublishArt,
  onShare,
  onVersionHistory,
  renameLocked = false,
  explorePublished = false,
  onImportSheet,
  onImportImage,
  onNewTile,
  keyOf,
  menus,
  afterMenus = [],
  fileSwitcher,
  onUndo,
  onRedo,
}: {
  hidden?: boolean;
  file: TileFile;
  fileInput: RefObject<HTMLInputElement | null>;
  sprite: SpriteApi;
  onOpenCloud: () => void;
  recent: MenuItem[];
  onExport: () => void;
  onPublish?: () => void;
  onPublishArt?: () => void;
  onShare?: () => void;
  onVersionHistory?: () => void;
  renameLocked?: boolean;
  explorePublished?: boolean;
  onImportSheet: () => void;
  onImportImage: () => void;
  onNewTile: () => void;
  keyOf: (id: ActionId) => string | undefined;
  menus: { label: string; sections: MenuSections }[];
  afterMenus?: { label: string; sections: MenuSections }[];
  /** The open-files dropdown beside the name. */
  fileSwitcher: ReactNode;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const framesInput = useRef<HTMLInputElement>(null);

  return (
    <header
      hidden={hidden}
      className="col-span-3 flex min-h-12 min-w-0 items-center gap-1 border-b bg-background px-3 py-2"
    >
      <Link
        href="/tiles"
        aria-label="My projects"
        title="My projects"
        className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-4"
          fill="none"
        >
          <path
            d="M10 3 5 8l5 5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
      <InputGroup className="h-8 w-auto shrink-0 border-transparent bg-transparent shadow-none hover:border-border focus-within:border-border">
        <InputGroupInput
          aria-label="File name"
          value={file.name}
          readOnly={renameLocked}
          title={
            renameLocked ? "Only the owner can rename this project" : undefined
          }
          onChange={(e) => file.rename(e.target.value)}
          maxLength={100}
          className="w-24 px-2 font-semibold xl:w-32"
        />
        <InputGroupText className="pr-1 pl-0 text-xs">
          {PIGXEL_EXTENSION}
          {file.dirty && (
            <span title="Unsaved changes" className="ml-1">
              •
            </span>
          )}
        </InputGroupText>
      </InputGroup>
      {fileSwitcher}
      <Menu
        label="File"
        disabled={file.busy}
        sections={[
          [
            {
              label: "New tile…",
              onSelect: onNewTile,
            },
            {
              label: "Open from your computer…",
              shortcut: keyOf("command:open"),
              onSelect: file.openFromComputer,
            },
            {
              label: "Open from Pigxel cloud…",
              onSelect: onOpenCloud,
            },
            {
              label: "Open recent",
              submenu: [
                recent.length
                  ? recent
                  : [
                      {
                        label: "No recent files",
                        disabled: true,
                        onSelect: () => {},
                      },
                    ],
              ],
            },
            {
              label: "Import",
              submenu: [
                [
                  { label: "Image…", onSelect: onImportImage },
                  {
                    label: "Pictures as frames…",
                    onSelect: () => framesInput.current?.click(),
                  },
                  { label: "Sprite sheet…", onSelect: onImportSheet },
                ],
              ],
            },
          ],
          [
            {
              label: "Save to Pigxel cloud",
              shortcut: keyOf("command:save"),
              onSelect: file.save,
            },
            {
              label: "Save as copy",
              onSelect: () =>
                file.openDocument(
                  sprite.document(),
                  `${file.name.slice(0, 93)} (copy)`,
                ),
            },
            {
              label: "Version history…",
              onSelect: () => onVersionHistory?.(),
              hidden: !onVersionHistory,
            },
            {
              label: "Download .pigxel",
              onSelect: file.download,
            },
          ],
          [
            {
              label: "Export…",
              shortcut: keyOf("command:export"),
              onSelect: onExport,
            },
            {
              label: explorePublished
                ? "Edit Explore details…"
                : "Publish to Explore…",
              onSelect: () => onPublishArt?.(),
              disabled: !onPublishArt,
            },
            {
              label: "Publish to Assets…",
              onSelect: () => onPublish?.(),
              hidden: !onPublish,
            },
          ],
        ]}
      />
      {menus.map((menu) => (
        <Menu key={menu.label} label={menu.label} sections={menu.sections} />
      ))}
      {afterMenus.map((menu) => (
        <Menu key={menu.label} label={menu.label} sections={menu.sections} />
      ))}
      <input
        ref={fileInput}
        type="file"
        accept={`${PIGXEL_EXTENSION},application/json,${IMAGE_FILE_TYPES}`}
        className="hidden"
        onChange={(e) => {
          file.onFileChosen(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={framesInput}
        type="file"
        multiple
        accept={IMAGE_FILE_TYPES}
        className="hidden"
        onChange={(e) => {
          file.openFrames([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <p
        role="status"
        title={file.busy ? undefined : file.status?.text}
        className={cn(
          "ml-3 min-w-0 truncate text-xs",
          file.status?.tone === "error"
            ? "text-destructive"
            : "text-muted-foreground",
        )}
      >
        {!file.busy && file.location && (
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="mr-1.5 inline size-4 align-[-3px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          >
            <path d="M4.5 12.5h7a2.5 2.5 0 0 0 .4-5 3.5 3.5 0 0 0-6.8-.9A2.8 2.8 0 0 0 4.5 12.5Z" />
          </svg>
        )}
        {file.busy ? "Working…" : file.status?.text}
      </p>
      {!file.busy && file.status?.retry && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={file.save}
          className="shrink-0"
        >
          {file.status.retry}
        </Button>
      )}
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <IconButton
          label="Undo"
          shortcut={keyOf("command:undo")}
          onClick={onUndo}
        >
          <path d="M6 4 3 7l3 3" />
          <path d="M3 7h6.5a3.5 3.5 0 0 1 0 7H8" />
        </IconButton>
        <IconButton
          label="Redo"
          shortcut={keyOf("command:redo")}
          onClick={onRedo}
        >
          <path d="m10 4 3 3-3 3" />
          <path d="M13 7H6.5a3.5 3.5 0 0 0 0 7H8" />
        </IconButton>
        <TokensButton />
        {onShare && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onShare}
            className="shrink-0"
          >
            Share
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={file.save}
          className="shrink-0"
        >
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onExport}
          className="shrink-0 bg-pink-strong text-white hover:bg-pink-strong-hover"
        >
          Export
        </Button>
      </div>
    </header>
  );
}

function IconButton({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      onClick={onClick}
      className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}
