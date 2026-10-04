"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { newTileUrl } from "@/lib/pigxel-file/open-tile";
import type { OpenSource } from "../constants";
import { useModifierLabel } from "@/lib/utils/use-modifier-label";
import type { TileFile } from "../use-tile-file";
import { Menu } from "./menu/menu";
import { TokensButton } from "@/features/ai/components/tokens-button/tokens-button";
import type { MenuSections } from "./menu/constants";
import type { SpriteApi } from "../pixel-canvas/use-sprite";
import { frameActions, layerActions } from "../timeline/actions";
import type { Playback } from "../timeline/use-playback";

export function EditorHeader({
  hidden,
  draftId,
  file,
  fileInput,
  drive,
  sprite,
  playback,
  onOpenFrom,
  onConnectDrive,
  onExport,
  onPublish,
  onImportSheet,
  onTilemap,
  menus,
  afterMenus = [],
}: {
  hidden?: boolean;
  draftId: string;
  file: TileFile;
  fileInput: RefObject<HTMLInputElement | null>;
  drive: DriveStatus;
  sprite: SpriteApi;
  playback: Playback;
  onOpenFrom: (source: OpenSource) => void;
  onConnectDrive: () => void;
  onExport: () => void;
  onPublish?: () => void;
  onImportSheet: () => void;
  onTilemap: (convert: boolean) => void;
  menus: { label: string; sections: MenuSections }[];
  afterMenus?: { label: string; sections: MenuSections }[];
}) {
  const router = useRouter();
  const framesInput = useRef<HTMLInputElement>(null);
  const mod = useModifierLabel();

  return (
    <header
      hidden={hidden}
      className="col-span-3 flex min-h-12 flex-wrap items-center gap-x-2 gap-y-2 border-b bg-background px-4 py-2"
    >
      <Link
        href="/tiles"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "mr-2 text-sm",
        })}
      >
        ← My projects
      </Link>
      <Menu
        label="File"
        disabled={file.busy}
        sections={[
          [
            {
              label: "New tile…",
              onSelect: () => router.push(newTileUrl(draftId)),
            },
            {
              label: "Open from your computer…",
              shortcut: `${mod}O`,
              onSelect: file.openFromComputer,
            },
            {
              label: "Open from Pigxel cloud…",
              onSelect: () => onOpenFrom("cloud"),
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
              shortcut: file.location?.kind === "cloud" ? `${mod}S` : undefined,
              onSelect: file.saveToCloud,
            },
            {
              label: !drive.connected
                ? "Connect Google Drive…"
                : file.location && file.location.kind !== "drive"
                  ? "Move to Google Drive"
                  : "Save to Google Drive",
              shortcut: file.location?.kind === "drive" ? `${mod}S` : undefined,
              onSelect: drive.connected ? file.saveToDrive : onConnectDrive,
              hidden: !drive.available,
            },
            {
              label: "Download .pigxel",
              shortcut: file.location ? undefined : `${mod}S`,
              onSelect: file.download,
            },
          ],
          [
            {
              label: "Export…",
              shortcut: `${mod}E`,
              onSelect: onExport,
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
      <InputGroup className="ml-2 h-8 w-auto">
        <InputGroupInput
          aria-label="File name"
          value={file.name}
          onChange={(e) => file.rename(e.target.value)}
          maxLength={100}
          className="w-40 px-2"
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
        className={cn(
          "ml-2 text-sm",
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
        >
          {file.status.retry}
        </Button>
      )}
      {drive.connected && (
        <p
          className="ml-auto truncate text-xs text-muted-foreground"
          title="Google account used for Google Drive"
        >
          Google Drive · {drive.email ?? "connected"}
        </p>
      )}
      <TokensButton className={drive.connected ? undefined : "ml-auto"} />
    </header>
  );
}
