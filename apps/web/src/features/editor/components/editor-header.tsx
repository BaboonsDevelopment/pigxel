"use client";

import Link from "next/link";
import { useRef, type RefObject } from "react";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import type { DriveStatus } from "@/lib/google-drive/status";
import { PIGXEL_EXTENSION } from "@/lib/pigxel-file/format";
import { IMAGE_FILE_TYPES } from "@/lib/pigxel-file/import-image";
import type { OpenSource } from "../constants";
import type { ActionId } from "../keymap";
import type { TileFile } from "../use-tile-file";
import { Menu } from "./menu/menu";
import { TokensButton } from "@/features/ai/components/tokens-button/tokens-button";
import type { MenuItem, MenuSections } from "./menu/constants";
import type { SpriteApi } from "../pixel-canvas/use-sprite";
import { frameActions, layerActions } from "../timeline/actions";
import type { Playback } from "../timeline/use-playback";

export function EditorHeader({
  hidden,
  file,
  fileInput,
  drive,
  sprite,
  playback,
  onOpenFrom,
  recent,
  onConnectDrive,
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
  onTilemap,
  keyOf,
  menus,
  afterMenus = [],
}: {
  hidden?: boolean;
  file: TileFile;
  fileInput: RefObject<HTMLInputElement | null>;
  drive: DriveStatus;
  sprite: SpriteApi;
  playback: Playback;
  onOpenFrom: (source: OpenSource) => void;
  recent: MenuItem[];
  onConnectDrive: () => void;
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
  onTilemap: (convert: boolean) => void;
  keyOf: (id: ActionId) => string | undefined;
  menus: { label: string; sections: MenuSections }[];
  afterMenus?: { label: string; sections: MenuSections }[];
}) {
  const framesInput = useRef<HTMLInputElement>(null);

  return (
    <header
      hidden={hidden}
      className="col-span-3 flex min-h-12 min-w-0 items-center gap-1 border-b bg-background px-4 py-2"
    >
      <Link
        href="/tiles"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "mr-1 shrink-0 text-sm xl:mr-2",
        })}
        aria-label="My projects"
      >
        ←<span className="hidden xl:inline"> My projects</span>
      </Link>
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
              onSelect: () => onOpenFrom("cloud"),
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
              label: drive.connected
                ? "Open from Google Drive…"
                : "Connect Google Drive…",
              onSelect: () =>
                drive.connected ? onOpenFrom("drive") : onConnectDrive(),
              hidden: !drive.available,
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
              label:
                file.location && file.location.kind !== "cloud"
                  ? "Move to Pigxel cloud"
                  : "Save to Pigxel cloud",
              shortcut:
                file.location?.kind === "cloud"
                  ? keyOf("command:save")
                  : undefined,
              onSelect: file.saveToCloud,
            },
            {
              label: !drive.connected
                ? "Connect Google Drive…"
                : file.location && file.location.kind !== "drive"
                  ? "Move to Google Drive"
                  : "Save to Google Drive",
              shortcut:
                file.location?.kind === "drive"
                  ? keyOf("command:save")
                  : undefined,
              onSelect: drive.connected ? file.saveToDrive : onConnectDrive,
              hidden: !drive.available,
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
              shortcut: file.location ? undefined : keyOf("command:save"),
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
      <Menu
        label="Layer"
        sections={layerActions(sprite, undefined, undefined, onTilemap)}
      />
      <Menu label="Frame" sections={frameActions(sprite, playback)} />
      {afterMenus.map((menu) => (
        <Menu key={menu.label} label={menu.label} sections={menu.sections} />
      ))}
      <InputGroup className="ml-1 h-8 w-auto shrink-0 xl:ml-2">
        <InputGroupInput
          aria-label="File name"
          value={file.name}
          readOnly={renameLocked}
          title={
            renameLocked ? "Only the owner can rename this project" : undefined
          }
          onChange={(e) => file.rename(e.target.value)}
          maxLength={100}
          className="w-28 px-2 xl:w-40"
        />
        <InputGroupText className="pr-2 pl-0 text-xs">
          {PIGXEL_EXTENSION}
          {file.dirty && (
            <span title="Unsaved changes" className="ml-1">
              •
            </span>
          )}
        </InputGroupText>
      </InputGroup>
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
          "ml-2 min-w-0 truncate text-sm",
          file.status?.tone === "error"
            ? "text-destructive"
            : "text-muted-foreground",
        )}
      >
        {file.busy ? "Working…" : file.status?.text}
      </p>
      {!file.busy && file.status?.retry && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={file.status.connect ? onConnectDrive : file.save}
          className="shrink-0"
        >
          {file.status.retry}
        </Button>
      )}
      <div className="ml-auto flex min-w-0 items-center gap-2">
        {drive.connected && (
          <p
            className="hidden min-w-0 truncate text-xs text-muted-foreground 2xl:block"
            title={`Google Drive · ${drive.email ?? "connected"}`}
          >
            Google Drive · {drive.email ?? "connected"}
          </p>
        )}
        {onShare && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onShare}
            className="shrink-0"
          >
            Share…
          </Button>
        )}
        <TokensButton />
      </div>
    </header>
  );
}
