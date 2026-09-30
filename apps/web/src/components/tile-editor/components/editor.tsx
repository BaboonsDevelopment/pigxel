"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { DEFAULT_SCALE, type Area } from "@/components/pixel-canvas/constants";
import { zoom } from "@/components/pixel-canvas/helpers";
import { clampPenSize, type PenSettings } from "@/components/pixel-canvas/pen";
import {
  PixelCanvas,
  type PixelCanvasHandle,
} from "@/components/pixel-canvas/pixel-canvas";
import {
  useSprite,
  type SpriteApi,
} from "@/components/pixel-canvas/use-sprite";
import { Timeline } from "@/components/timeline/timeline";
import { usePlayback } from "@/components/timeline/use-playback";
import { DEFAULT_EXPORT, type ExportSettings } from "@/lib/export/constants";
import { connectDriveUrl } from "@/lib/google-drive/status";
import { panelRows } from "@/lib/layers/tree";
import { readPen, writePen, type Draft } from "@/lib/pigxel-file/draft";
import type { PigxelDocument } from "@/lib/pigxel-file/format";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import type { Command, EditorProps, OpenSource, ToolId } from "../constants";
import { shortcutFor, sizeKey } from "../helpers";
import { usePan } from "../use-pan";
import { useTileFile } from "../use-tile-file";
import { ChatPlaceholder } from "./chat-placeholder";
import { EditorHeader } from "./editor-header";
import { ToolBar } from "./tool-bar";
import { ToolOptions } from "./tool-options";

// Loaded on their own so the canvas is ready first: the chat brings the AI,
// editing and picture-to-pixel-art code; the file picker and export open on
// demand.
const EditorChat = dynamic(() => import("./editor-chat"), {
  ssr: false,
  loading: ChatPlaceholder,
});
const OpenTileDialog = dynamic(() => import("./open-tile-dialog"), {
  ssr: false,
});
const ExportDialog = dynamic(() => import("./export-dialog"), { ssr: false });

/**
 * The editor for one tile: file bar and tool settings on top, tools on the
 * left, canvas and timeline in the middle, AI chat on the right.
 */
export function Editor({
  userId,
  drive,
  driveError,
  draft,
  image,
}: EditorProps & { draft: Draft; image: PigxelDocument }) {
  const router = useRouter();
  const [opening, setOpening] = useState<OpenSource | null>(null);
  const [exporting, setExporting] = useState(false);
  // Kept while the tile is open, so Export comes back with the last choices.
  const [exportSettings, setExportSettings] =
    useState<ExportSettings>(DEFAULT_EXPORT);
  const [tool, setTool] = useState<ToolId>("pen");
  const [pen, setPen] = useState<PenSettings>(() => readPen(userId));
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [highlight, setHighlight] = useState<Area | null>(null);
  const canvas = useRef<PixelCanvasHandle>(null);
  const workspace = useRef<HTMLElement>(null);
  const pan = usePan();
  const fileInput = useRef<HTMLInputElement>(null);
  const tile = useRef<SpriteApi>(null);
  const file = useTileFile({
    tile,
    fileInput,
    userId,
    initial: draft,
    drive,
    onOpen: (id) => router.push(editorUrl(id)),
    notice: driveError
      ? {
          tone: "error",
          text: "Google Drive wasn’t connected. Try again when you’re ready.",
        }
      : undefined,
  });

  // Every finished change to the sprite marks the tile for saving.
  const sprite = useSprite(image, file.markDirty);
  useLayoutEffect(() => {
    tile.current = sprite;
  });
  const playback = usePlayback(sprite);

  // Tool colour and sizes carry over to every tile.
  useEffect(() => writePen(userId, pen), [userId, pen]);

  /** Goes to Google to link the account, then back to this tile with its draft intact. */
  const connectDrive = () =>
    window.location.assign(connectDriveUrl(editorUrl(draft.id)));

  const resizePen = (step: 1 | -1) => {
    const key = sizeKey(tool);
    if (key) setPen((p) => ({ ...p, [key]: clampPenSize(p[key] + step) }));
  };

  /** Selects the layer `step` rows down the timeline (up when negative). */
  const selectLayer = (step: 1 | -1) => {
    const rows = panelRows(sprite.tree);
    const at = rows.findIndex((row) => row.layer.id === sprite.layerId);
    const row = rows[at + step];
    if (row) sprite.selectLayer(row.layer.id);
  };

  const commands: Record<Command, () => void> = {
    save: file.save,
    open: file.openFromComputer,
    export: () => setExporting(true),
    undo: sprite.undo,
    redo: sprite.redo,
    zoomIn: () => setScale((s) => zoom(s, -1)),
    zoomOut: () => setScale((s) => zoom(s, 1)),
    zoomReset: () => setScale(DEFAULT_SCALE),
    layerAbove: () => selectLayer(-1),
    layerBelow: () => selectLayer(1),
    newLayer: () => sprite.addLayer("normal"),
    clearLayer: sprite.clearCel,
    newFrame: () => sprite.addFrame(true),
    previousFrame: () => sprite.stepFrame(-1),
    nextFrame: () => sprite.stepFrame(1),
    penSmaller: () => resizePen(-1),
    penBigger: () => resizePen(1),
  };

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const shortcut = shortcutFor(e);
    if (!shortcut) return;
    e.preventDefault();
    if ("tool" in shortcut) setTool(shortcut.tool);
    else commands[shortcut.command]();
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

  return (
    <div className="grid h-dvh grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto_minmax(0,1fr)]">
      <EditorHeader
        file={file}
        fileInput={fileInput}
        drive={drive}
        sprite={sprite}
        playback={playback}
        onOpenFrom={setOpening}
        onConnectDrive={connectDrive}
        onExport={() => setExporting(true)}
      />
      <div className="col-span-3 flex min-h-12 items-center border-b bg-background px-4 py-2">
        <ToolOptions tool={tool} pen={pen} onChange={setPen} />
      </div>
      <ToolBar tool={tool} onSelect={setTool} />
      <div className="flex min-h-0 flex-col">
        <main
          ref={workspace}
          {...pan.handlers}
          className={cn(
            "flex min-h-0 flex-1 overflow-auto bg-muted p-12",
            pan.panning && "cursor-grab [&_*]:cursor-grab!",
          )}
        >
          <div className="m-auto">
            <PixelCanvas
              ref={canvas}
              tool={tool}
              pen={pen}
              scale={scale}
              sprite={sprite}
              highlight={highlight}
              onPickColor={(color) => setPen((p) => ({ ...p, color }))}
            />
          </div>
        </main>
        <Timeline sprite={sprite} playback={playback} />
      </div>
      <EditorChat
        canvas={canvas}
        sprite={sprite}
        playback={playback}
        onHighlight={setHighlight}
      />
      {opening && (
        <OpenTileDialog
          source={opening}
          drive={drive}
          draftId={draft.id}
          file={file}
          onClose={() => setOpening(null)}
        />
      )}
      {exporting && (
        <ExportDialog
          source={{
            name: file.name,
            size: sprite.size,
            frames: sprite.frames,
            frameId: sprite.frameId,
            background: sprite.background,
            picture: (id) => sprite.composite(["reference"], id),
          }}
          settings={exportSettings}
          onChange={setExportSettings}
          onClose={() => setExporting(false)}
        />
      )}
    </div>
  );
}
