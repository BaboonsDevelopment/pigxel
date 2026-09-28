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
import {
  DEFAULT_PEN,
  clampPenSize,
  type PenSettings,
} from "@/components/pixel-canvas/pen";
import { connectDriveUrl, type DriveStatus } from "@/lib/google-drive/status";
import { imageToPixelArt } from "@/lib/image/helpers";
import { GENERATED_PICTURE_STEPS } from "@/lib/image/pipeline";
import { readDraft, type Draft } from "@/lib/pigxel-file/draft";
import {
  PIGXEL_EXTENSION,
  parsePigxel,
  type PigxelImage,
} from "@/lib/pigxel-file/format";
import { useIsClient } from "@/lib/use-is-client";
import { DriveFilesDialog } from "./drive-files-dialog";
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
  drive: DriveStatus;
  /** Connecting Google Drive was cancelled or failed on the way back. */
  driveError?: boolean;
};

/**
 * The tile page for the draft kept in this browser: tools on the left, canvas
 * in the middle, AI chat on the right. It renders in the browser only, where
 * the draft lives.
 */
export function TileEditor(props: EditorProps) {
  if (!useIsClient()) return <div className="h-dvh bg-muted" />;
  return <DraftLoader {...props} />;
}

function DraftLoader(props: EditorProps) {
  const { userId } = props;
  const [restored] = useState(() => {
    const draft = readDraft(userId);
    try {
      return draft ? { draft, image: parsePigxel(draft.file) } : null;
    } catch {
      return null;
    }
  });
  if (!restored) return <StartNewTile />;
  return <Editor {...props} draft={restored.draft} image={restored.image} />;
}

/** With no tile to continue, the editor sends people to create one. */
function StartNewTile() {
  const router = useRouter();
  useEffect(() => router.replace("/tiles/new"), [router]);
  return <div className="h-dvh bg-muted" />;
}

/** Goes to Google to link the account, then back to the editor with the draft intact. */
function connectDrive() {
  window.location.assign(connectDriveUrl("/tiles/edit"));
}

function Editor({
  userId,
  drive,
  driveError,
  draft,
  image,
}: EditorProps & { draft: Draft; image: PigxelImage }) {
  const router = useRouter();
  const [pickingDriveFile, setPickingDriveFile] = useState(false);
  const [tool, setTool] = useState<ToolId>("pen");
  const [pen, setPen] = useState<PenSettings>(draft.pen ?? DEFAULT_PEN);
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
    pen,
    drive,
    notice: driveError
      ? {
          tone: "error",
          text: "Google Drive wasn’t connected. Try again when you’re ready.",
        }
      : undefined,
  });

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
          ← Your tiles
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
              label: drive.connected
                ? "From Google Drive…"
                : "Connect Google Drive…",
              onSelect: () => {
                if (!drive.connected) connectDrive();
                else if (file.confirmDiscard()) setPickingDriveFile(true);
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
              label: "Download .pigxel",
              shortcut: file.driveFile ? undefined : `${mod}S`,
              onSelect: file.download,
            },
            {
              label: !drive.connected
                ? "Connect Google Drive…"
                : file.driveFile
                  ? "Save to Google Drive"
                  : "Save to Google Drive…",
              shortcut: file.driveFile ? `${mod}S` : undefined,
              onSelect: drive.connected ? file.saveToDrive : connectDrive,
              hidden: !drive.available,
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
            onClick={file.status.connect ? connectDrive : file.saveToDrive}
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
      {pickingDriveFile && (
        <DriveFilesDialog
          email={drive.email}
          onPick={file.openDriveFile}
          onClose={() => setPickingDriveFile(false)}
        />
      )}
    </div>
  );
}
