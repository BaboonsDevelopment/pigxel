"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { ChatPanel } from "@/components/chat-panel/chat-panel";
import type { CanvasBridge } from "@/components/chat-panel/constants";
import {
  DEFAULT_SCALE,
  DEFAULT_SIZE,
  type Area,
} from "@/components/pixel-canvas/constants";
import { zoom } from "@/components/pixel-canvas/helpers";
import {
  PixelCanvas,
  type PixelCanvasHandle,
} from "@/components/pixel-canvas/pixel-canvas";
import { clampPenSize, type PenSettings } from "@/components/pixel-canvas/pen";
import { connectDriveUrl, type DriveStatus } from "@/lib/google-drive/status";
import { imageToPixelArt } from "@/lib/image/helpers";
import { GENERATED_PICTURE_STEPS } from "@/lib/image/pipeline";
import {
  listDrafts,
  readDraft,
  readPen,
  writePen,
  type Draft,
} from "@/lib/pigxel-file/draft";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import {
  PIGXEL_EXTENSION,
  parsePigxel,
  type PigxelImage,
} from "@/lib/pigxel-file/format";
import { useIsClient } from "@/lib/use-is-client";
import { listCloudTiles } from "@/lib/pigxel-file/cloud";
import { DriveError, listDriveFiles } from "@/lib/pigxel-file/google-drive";
import { FilesDialog } from "./files-dialog";
import { Menu } from "./menu";
import { PenOptions } from "./pen-options";
import { ToolBar } from "./tool-bar";
import { TOOLS, type ToolId } from "./tools";
import { useTileFile } from "./use-tile-file";

const noSubscribe = () => () => {};

/** Shortcut prefix for the person's platform; "Ctrl+" during server rendering. */
function useModifierLabel() {
  return useSyncExternalStore(
    noSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+"),
    () => "Ctrl+",
  );
}

/** Typing in a field must not trigger editor shortcuts. */
function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

type EditorProps = {
  userId: string;
  /** The draft to edit, from the URL; the most recent one when missing. */
  tileId?: string;
  drive: DriveStatus;
  /** Connecting Google Drive was cancelled or failed on the way back. */
  driveError?: boolean;
};

/**
 * The tile page for one of the drafts kept in this browser: tools on the
 * left, canvas in the middle, AI chat on the right. It renders in the browser
 * only, where the drafts live.
 */
export function TileEditor(props: EditorProps) {
  if (!useIsClient()) return <div className="h-dvh bg-muted" />;
  // A new tile id means a different tile: start its editor from scratch.
  return <DraftLoader key={props.tileId ?? ""} {...props} />;
}

function DraftLoader(props: EditorProps) {
  const { userId, tileId } = props;
  const [restored] = useState(() => {
    if (!tileId) return { redirect: listDrafts(userId)[0]?.id ?? null };
    const draft = readDraft(userId, tileId);
    try {
      return draft
        ? { draft, image: parsePigxel(draft.file) }
        : { missing: true as const };
    } catch {
      return { missing: true as const };
    }
  });
  if ("redirect" in restored)
    return (
      <Redirect
        to={restored.redirect ? editorUrl(restored.redirect) : "/tiles/new"}
      />
    );
  if ("missing" in restored) return <MissingTile />;
  return <Editor {...props} draft={restored.draft} image={restored.image} />;
}

function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return <div className="h-dvh bg-muted" />;
}

/** A link to a tile that isn't in this browser, e.g. opened on another device. */
function MissingTile() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-muted p-6 text-center">
      <h1 className="text-xl font-semibold">This tile isn’t in this browser</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Tiles you haven’t saved to Pigxel cloud or Google Drive stay in the
        browser they were made in.
      </p>
      <Link
        href="/tiles"
        className="text-sm font-medium underline underline-offset-4"
      >
        Go to My projects
      </Link>
    </main>
  );
}

function Editor({
  userId,
  drive,
  driveError,
  draft,
  image,
}: EditorProps & { draft: Draft; image: PigxelImage }) {
  const router = useRouter();
  const [picking, setPicking] = useState<"cloud" | "drive" | null>(null);
  const [tool, setTool] = useState<ToolId>("pen");
  const [pen, setPen] = useState<PenSettings>(() => readPen(userId));
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [highlight, setHighlight] = useState<Area | null>(null);
  const mod = useModifierLabel();
  const canvas = useRef<PixelCanvasHandle>(null);
  const workspace = useRef<HTMLElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const file = useTileFile({
    canvas,
    fileInput,
    userId,
    initial: draft,
    initialBackground: image.background ?? "transparent",
    drive,
    onOpen: (id) => router.push(editorUrl(id)),
    notice: driveError
      ? {
          tone: "error",
          text: "Google Drive wasn’t connected. Try again when you’re ready.",
        }
      : undefined,
  });

  // Pen colour and size carry over to every tile.
  useEffect(() => writePen(userId, pen), [userId, pen]);

  /** Goes to Google to link the account, then back to this tile with its draft intact. */
  const connectDrive = () =>
    window.location.assign(connectDriveUrl(editorUrl(draft.id)));

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
      const key = e.key.toLowerCase();
      if (key === "s") file.save();
      else if (key === "o") file.openFromComputer();
      else return;
      e.preventDefault();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
    const shortcut = TOOLS.find(
      (t) => t.shortcut.toLowerCase() === e.key.toLowerCase(),
    );
    if (shortcut) setTool(shortcut.id);
    else if (e.key === "[")
      setPen((p) => ({ ...p, size: clampPenSize(p.size - 1) }));
    else if (e.key === "]")
      setPen((p) => ({ ...p, size: clampPenSize(p.size + 1) }));
    else return;
    e.preventDefault();
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // The wheel zooms the tile instead of scrolling the page.
  useEffect(() => {
    const area = workspace.current;
    if (!area) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => zoom(s, e.deltaY));
    };
    area.addEventListener("wheel", onWheel, { passive: false });
    return () => area.removeEventListener("wheel", onWheel);
  }, []);

  const fullArea = (): Area => ({
    x: 0,
    y: 0,
    ...(canvas.current?.size ?? DEFAULT_SIZE),
  });

  const bridge: CanvasBridge = {
    isEmpty: () => canvas.current?.isEmpty() ?? true,
    fullArea,
    freeArea: () => canvas.current?.freeArea() ?? null,
    snapshot: () => canvas.current?.snapshot() ?? "",
    selectArea: async () => (await canvas.current?.selectArea()) ?? null,
    adjustArea: async (area) =>
      (await canvas.current?.adjustArea(area)) ?? null,
    highlight: setHighlight,
    // A generated picture is turned into pixel art at the area's size.
    async place(dataUrl, area, replace) {
      const image = await (await fetch(dataUrl)).blob();
      const art = await imageToPixelArt(
        image,
        area.w,
        area.h,
        GENERATED_PICTURE_STEPS,
      );
      if (replace) canvas.current?.clear();
      canvas.current?.draw(art.rgba, area);
    },
  };

  return (
    <div className="grid h-dvh grid-cols-[auto_minmax(0,1fr)_340px] grid-rows-[auto_auto_minmax(0,1fr)]">
      <header className="col-span-3 flex min-h-12 flex-wrap items-center gap-x-2 gap-y-2 border-b bg-background px-4 py-2">
        <Link
          href="/tiles"
          className="mr-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← My projects
        </Link>
        <label className="flex items-center rounded-md border bg-background pr-2 focus-within:ring-2 focus-within:ring-ring">
          <span className="sr-only">File name</span>
          <input
            value={file.name}
            onChange={(e) => file.rename(e.target.value)}
            maxLength={100}
            className="h-8 w-40 bg-transparent px-2 text-sm outline-none"
          />
          <span className="text-xs text-muted-foreground">
            {PIGXEL_EXTENSION}
            {file.dirty && (
              <span title="Unsaved changes" className="ml-1">
                •
              </span>
            )}
          </span>
        </label>
        <Menu
          label="Open"
          disabled={file.busy}
          items={[
            {
              label: "New tile…",
              onSelect: () => router.push("/tiles/new"),
            },
            {
              label: "From your computer…",
              shortcut: `${mod}O`,
              onSelect: file.openFromComputer,
            },
            {
              label: "From Pigxel cloud…",
              onSelect: () => {
                setPicking("cloud");
              },
            },
            {
              label: drive.connected
                ? "From Google Drive…"
                : "Connect Google Drive…",
              onSelect: () => {
                if (!drive.connected) connectDrive();
                else setPicking("drive");
              },
              hidden: !drive.available,
            },
          ]}
        />
        <Menu
          label="Save"
          disabled={file.busy}
          items={[
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
              onSelect: drive.connected ? file.saveToDrive : connectDrive,
              hidden: !drive.available,
            },
            {
              label: "Download .pigxel",
              shortcut: file.location ? undefined : `${mod}S`,
              onSelect: file.download,
            },
          ]}
        />
        <input
          ref={fileInput}
          type="file"
          accept={`${PIGXEL_EXTENSION},application/json`}
          className="hidden"
          onChange={(e) => {
            file.onFileChosen(e.target.files?.[0]);
            // Lets the same file be chosen again later.
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
          <button
            type="button"
            onClick={file.status.connect ? connectDrive : file.save}
            className="h-8 rounded-md border px-3 text-sm font-medium hover:bg-muted"
          >
            {file.status.retry}
          </button>
        )}
        {drive.connected && (
          <p
            className="ml-auto truncate text-xs text-muted-foreground"
            title="Google account used for Google Drive"
          >
            Google Drive · {drive.email ?? "connected"}
          </p>
        )}
      </header>
      <div className="col-span-3 flex min-h-12 items-center border-b bg-background px-4 py-2">
        {tool === "pen" && <PenOptions pen={pen} onChange={setPen} />}
      </div>
      <ToolBar tool={tool} onSelect={setTool} />
      <main ref={workspace} className="flex overflow-auto bg-muted p-12">
        <div className="m-auto">
          <PixelCanvas
            ref={canvas}
            pen={pen}
            scale={scale}
            highlight={highlight}
            background={file.background}
            initialImage={image}
            onChange={file.markDirty}
          />
        </div>
      </main>
      <ChatPanel canvas={bridge} />
      {picking === "cloud" && (
        <FilesDialog
          title="Open from Pigxel cloud"
          empty="No tiles in Pigxel cloud yet. Tiles you save there appear here."
          load={async () =>
            (await listCloudTiles()).map((tile) => ({
              id: tile.id,
              name: tile.name,
              modified: tile.updatedAt,
              thumbnail: tile.thumbnail,
            }))
          }
          onPick={(item) =>
            file.openCloudTile({ id: item.id, name: item.name })
          }
          onClose={() => setPicking(null)}
        />
      )}
      {picking === "drive" && (
        <FilesDialog
          title="Open from Google Drive"
          subtitle={drive.email}
          empty="No Pigxel files in your Google Drive yet. Tiles you save there appear here. To open a file uploaded to Drive yourself, download it and open it from your computer."
          load={async () =>
            (await listDriveFiles()).map((f) => ({
              id: f.id,
              name: f.name,
              modified: f.modifiedTime,
            }))
          }
          errorAction={(error) =>
            error instanceof DriveError && error.needsConnect
              ? {
                  label: "Connect Google Drive",
                  href: connectDriveUrl(editorUrl(draft.id)),
                }
              : null
          }
          onPick={(item) =>
            file.openDriveFile({ id: item.id, name: item.name })
          }
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}
