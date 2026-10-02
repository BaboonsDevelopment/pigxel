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
import { outlined, replacedColor } from "@/components/pixel-canvas/effects";
import { rgbaOf, type Stamp } from "@/components/pixel-canvas/paint";
import { clampPenSize, type PenSettings } from "@/components/pixel-canvas/pen";
import {
  PixelCanvas,
  type PixelCanvasHandle,
} from "@/components/pixel-canvas/pixel-canvas";
import {
  pasteSource,
  useSelection,
} from "@/components/pixel-canvas/use-selection";
import {
  DEFAULT_VIEW,
  GRID_SIZES,
  ONION_FRAMES,
  type CanvasView,
} from "@/components/pixel-canvas/view";
import type { MenuSections } from "@/components/menu/constants";
import {
  useSprite,
  type SpriteApi,
} from "@/components/pixel-canvas/use-sprite";
import { Timeline } from "@/components/timeline/timeline";
import { usePlayback } from "@/components/timeline/use-playback";
import { DEFAULT_EXPORT, type ExportSettings } from "@/lib/export/constants";
import { decodeImage } from "@/lib/image/decode";
import { connectDriveUrl } from "@/lib/google-drive/status";
import { panelRows } from "@/lib/layers/tree";
import { colorsOf, pushRecent } from "@/lib/palette/presets";
import { readPen, writePen, type Draft } from "@/lib/pigxel-file/draft";
import type { PigxelDocument } from "@/lib/pigxel-file/format";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import type { Command, EditorProps, OpenSource, ToolId } from "../constants";
import { isTyping, shortcutFor, sizeKey } from "../helpers";
import { useModifierLabel } from "../use-modifier-label";
import { usePan } from "../use-pan";
import { useTileFile } from "../use-tile-file";
import { ChatPlaceholder } from "./chat-placeholder";
import { ColorPanel } from "./color-panel";
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
  const [view, setView] = useState<CanvasView>(DEFAULT_VIEW);
  // A picture the pen and brush paint with, from Edit › Use as brush.
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const mod = useModifierLabel();
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
  const selection = useSelection(sprite);

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
    // Undo first takes back lifted or pasted pixels that aren't down yet.
    undo: () => {
      if (!selection.cancel()) sprite.undo();
    },
    redo: () => {
      if (!selection.floating) sprite.redo();
    },
    zoomIn: () => setScale((s) => zoom(s, -1)),
    zoomOut: () => setScale((s) => zoom(s, 1)),
    zoomReset: () => setScale(DEFAULT_SCALE),
    layerAbove: () => selectLayer(-1),
    layerBelow: () => selectLayer(1),
    newLayer: () => sprite.addLayer("normal"),
    clearLayer: () => (selection.mask ? selection.clear() : sprite.clearCel()),
    newFrame: () => sprite.addFrame(true),
    previousFrame: () => sprite.stepFrame(-1),
    nextFrame: () => sprite.stepFrame(1),
    penSmaller: () => resizePen(-1),
    penBigger: () => resizePen(1),
    swapColors: () =>
      setPen((p) => ({ ...p, color: p.secondary, secondary: p.color })),
    selectAll: selection.selectAll,
    deselect: selection.deselect,
    invertSelection: selection.invert,
    copy: () => void selection.copy(),
    cut: () => {
      if (selection.copy()) selection.clear();
    },
    // Pasted pixels float until dropped, so the Move tool is ready for them.
    paste: () => {
      if (selection.paste()) setTool("move");
    },
    dropSelection: selection.drop,
    flipHorizontal: () => selection.transform("flipHorizontal"),
    flipVertical: () => selection.transform("flipVertical"),
    rotateRight: () => selection.transform("rotateRight"),
    nudgeUp: () => void selection.nudge(0, -1),
    nudgeDown: () => void selection.nudge(0, 1),
    nudgeLeft: () => void selection.nudge(-1, 0),
    nudgeRight: () => void selection.nudge(1, 0),
    toggleOnion: () => setView((v) => ({ ...v, onion: v.onion ? 0 : 1 })),
  };

  /** Changes the active cel (inside the selection, if any) as one step. */
  const applyEffect = (
    change: (
      pixels: Uint8ClampedArray,
      mask: Uint8Array | null,
    ) => Uint8ClampedArray,
  ) => {
    selection.drop();
    sprite.editCel((pixels) => change(pixels, selection.mask));
  };

  /** The selected pixels become the pen and brush tip, in their own colours. */
  const useAsBrush = () => {
    const piece = selection.selectedPiece();
    if (!piece) return;
    const pixels = new Uint8ClampedArray(piece.pixels);
    for (let i = 0; i < piece.mask.length; i++)
      if (!piece.mask[i]) pixels[i * 4 + 3] = 0;
    setStamp({ w: piece.w, h: piece.h, pixels });
    selection.deselect();
    setTool("pen");
  };

  const check = (on: boolean, label: string) => `${on ? "✓ " : ""}${label}`;
  const editMenu: MenuSections = [
    [
      { label: "Undo", shortcut: `${mod}Z`, onSelect: commands.undo },
      { label: "Redo", shortcut: `${mod}Y`, onSelect: commands.redo },
    ],
    [
      { label: "Cut", shortcut: `${mod}X`, onSelect: commands.cut },
      { label: "Copy", shortcut: `${mod}C`, onSelect: commands.copy },
      { label: "Paste", shortcut: `${mod}V`, onSelect: commands.paste },
      { label: "Delete", shortcut: "Del", onSelect: commands.clearLayer },
    ],
    [
      {
        label: "Select all",
        shortcut: `${mod}A`,
        onSelect: commands.selectAll,
      },
      {
        label: "Deselect",
        shortcut: `${mod}D`,
        onSelect: commands.deselect,
        disabled: !selection.mask,
      },
      {
        label: "Invert selection",
        shortcut: `${mod}Shift+I`,
        onSelect: commands.invertSelection,
      },
    ],
    [
      {
        label: "Flip horizontally",
        shortcut: "Shift+H",
        onSelect: commands.flipHorizontal,
      },
      {
        label: "Flip vertically",
        shortcut: "Shift+V",
        onSelect: commands.flipVertical,
      },
      {
        label: "Rotate 90° right",
        onSelect: commands.rotateRight,
      },
      {
        label: "Rotate 90° left",
        onSelect: () => selection.transform("rotateLeft"),
      },
    ],
    [
      {
        label: "Outline in primary colour",
        onSelect: () =>
          applyEffect((pixels, mask) =>
            outlined(pixels, sprite.size, rgbaOf(pen.color), mask),
          ),
      },
      {
        label: "Replace primary colour with secondary",
        onSelect: () =>
          applyEffect((pixels, mask) =>
            replacedColor(
              pixels,
              rgbaOf(pen.color),
              rgbaOf(pen.secondary),
              mask,
            ),
          ),
      },
    ],
    [
      {
        label: "Use selection as brush",
        onSelect: useAsBrush,
        disabled: !selection.mask,
      },
      {
        label: "Back to the normal brush",
        onSelect: () => setStamp(null),
        hidden: !stamp,
      },
    ],
  ];
  const viewMenu: MenuSections = [
    [
      {
        label: check(view.onion > 0, "Onion skin"),
        shortcut: "F3",
        onSelect: commands.toggleOnion,
      },
      ...ONION_FRAMES.map((count) => ({
        label: check(
          view.onion === count,
          `Show ${count} frame${count > 1 ? "s" : ""} each way`,
        ),
        onSelect: () => setView((v) => ({ ...v, onion: count })),
      })),
    ],
    [
      {
        label: check(view.pixelGrid, "Pixel grid"),
        onSelect: () => setView((v) => ({ ...v, pixelGrid: !v.pixelGrid })),
      },
      {
        label: check(view.gridSize === 0, "No grid"),
        onSelect: () => setView((v) => ({ ...v, gridSize: 0 })),
      },
      ...GRID_SIZES.map((n) => ({
        label: check(view.gridSize === n, `Grid ${n} × ${n}`),
        onSelect: () => setView((v) => ({ ...v, gridSize: n })),
      })),
    ],
  ];

  // Pasting: a picture copied in another app, or our own copy.
  const onPaste = useEffectEvent(async (e: ClipboardEvent) => {
    if (isTyping(e.target)) return;
    e.preventDefault();
    const file = [...(e.clipboardData?.files ?? [])].find((f) =>
      f.type.startsWith("image/"),
    );
    let image = null;
    if (file) {
      try {
        const { rgba, w, h } = await decodeImage(file, 32);
        image = {
          x: 0,
          y: 0,
          w,
          h,
          pixels: rgba,
          mask: new Uint8Array(w * h).fill(1),
        };
      } catch {
        // Not a picture the browser can read: paste our own copy instead.
      }
    }
    if (selection.paste(pasteSource(image))) setTool("move");
  });

  useEffect(() => {
    const listener = (e: ClipboardEvent) => void onPaste(e);
    window.addEventListener("paste", listener);
    return () => window.removeEventListener("paste", listener);
  }, []);

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
        menus={[
          { label: "Edit", sections: editMenu },
          { label: "View", sections: viewMenu },
        ]}
      />
      <div className="col-span-3 flex min-h-12 items-center border-b bg-background px-4 py-2">
        <ToolOptions
          tool={tool}
          pen={pen}
          onChange={setPen}
          selection={selection}
          view={view}
          onViewChange={setView}
          stamp={stamp}
          onClearStamp={() => setStamp(null)}
          onUseAsBrush={useAsBrush}
        />
      </div>
      <aside className="flex min-h-0 w-[6.5rem] flex-col border-r bg-background">
        <ToolBar tool={tool} onSelect={setTool} />
        <ColorPanel
          pen={pen}
          onChange={setPen}
          palette={sprite.palette}
          onPaletteChange={sprite.setPalette}
          frameColors={() => colorsOf(sprite.composite(["reference"]))}
          fileName={file.name}
        />
      </aside>
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
              selection={selection}
              view={view}
              stamp={stamp}
              highlight={highlight}
              onTextPlaced={() => setTool("move")}
              onPickColor={(color, slot) =>
                setPen((p) =>
                  slot === "primary"
                    ? { ...p, color }
                    : { ...p, secondary: color },
                )
              }
              onUseColor={(color) =>
                setPen((p) =>
                  p.recent[0] === color
                    ? p
                    : { ...p, recent: pushRecent(p.recent, color) },
                )
              }
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
