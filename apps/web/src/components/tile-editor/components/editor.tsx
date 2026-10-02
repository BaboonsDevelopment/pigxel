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
import { choiceDialog } from "@/components/confirm-dialog/confirm-dialog";
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
import { assetPixels, assetSize, type Asset } from "@/lib/assets/assets";
import { DEFAULT_EXPORT, type ExportSettings } from "@/lib/export/constants";
import { decodeImage } from "@/lib/image/decode";
import { connectDriveUrl } from "@/lib/google-drive/status";
import { panelRows } from "@/lib/layers/tree";
import { colorsOf, pushRecent } from "@/lib/palette/presets";
import { readPen, writePen, type Draft } from "@/lib/pigxel-file/draft";
import type { PigxelDocument } from "@/lib/pigxel-file/format";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import {
  IMAGE_FILE_TYPES,
  documentFromFrames,
  imageBaseName,
  isImageFile,
  pictureForTile,
  readPicture,
  sequenceOrder,
} from "@/lib/pigxel-file/import-image";
import { nativeSheet, type Picture } from "@/lib/pigxel-file/import-sheet";
import type { Slice } from "@/lib/slices/slices";
import { findTutorial } from "@/lib/tutorials/tutorials";
import type { Command, EditorProps, OpenSource, ToolId } from "../constants";
import { isTyping, shortcutFor, sizeKey } from "../helpers";
import { useModifierLabel } from "../use-modifier-label";
import { usePan } from "../use-pan";
import { useTileFile } from "../use-tile-file";
import { ChatPlaceholder } from "./chat-placeholder";
import { ColorPanel } from "./color-panel";
import { EditorHeader } from "./editor-header";
import { GuideCoach } from "./guide-coach";
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
const ImportSheetDialog = dynamic(() => import("./import-sheet-dialog"), {
  ssr: false,
});
const AssetPickerDialog = dynamic(() => import("./asset-picker-dialog"), {
  ssr: false,
});

/**
 * The editor for one tile: file bar and tool settings on top, tools on the
 * left, canvas and timeline in the middle, AI chat on the right; with a
 * tutorial's guide over it when one is open.
 */
export function Editor({
  userId,
  drive,
  driveError,
  guide,
  draft,
  image,
}: EditorProps & { draft: Draft; image: PigxelDocument }) {
  const router = useRouter();
  const [opening, setOpening] = useState<OpenSource | null>(null);
  const [exporting, setExporting] = useState(false);
  // A sprite sheet picked to cut into a new tile's frames.
  const sheetInput = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<{
    name: string;
    picture: Picture;
    scale: number;
  } | null>(null);
  const [inserting, setInserting] = useState(false);
  // Counted for the guides, which wait for an asset to be put in.
  const [inserted, setInserted] = useState(0);
  const tutorial = findTutorial(guide);
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

  // The slice picked with the Slice tool; gone when undo takes it away.
  const [sliceId, setSliceId] = useState<string | null>(null);
  const slice = sprite.slices.find((s) => s.id === sliceId) ?? null;
  const changeSlice = (next: Slice) =>
    sprite.setSlices(sprite.slices.map((s) => (s.id === next.id ? next : s)));
  const deleteSlice = () => {
    if (slice) sprite.setSlices(sprite.slices.filter((s) => s !== slice));
    setSliceId(null);
  };

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
    // With the Slice tool, Delete removes the picked slice instead.
    clearLayer: () =>
      tool === "slice" && slice
        ? deleteSlice()
        : selection.mask
          ? selection.clear()
          : sprite.clearCel(),
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

  /** Puts an asset's first frame in the middle of the active cel, floating, to be moved into place. */
  const insertAsset = (asset: Asset) => {
    const { w, h } = assetSize(asset);
    const pixels = assetPixels(asset);
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) mask[i] = pixels[i * 4 + 3] ? 1 : 0;
    const placed = selection.paste({
      x: Math.floor((sprite.size.w - w) / 2),
      y: Math.floor((sprite.size.h - h) / 2),
      w,
      h,
      pixels,
      mask,
    });
    if (placed) {
      setTool("move");
      setInserted((n) => n + 1);
    }
    return placed;
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
    [{ label: "Insert asset…", onSelect: () => setInserting(true) }],
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

  // Dropping a file: a picture goes on this tile where it lands (or opens as
  // a new tile), a .pigxel file opens as a new tile; a dialog asks first.
  const [dropping, setDropping] = useState(false);
  const dragDepth = useRef(0);
  const hasFiles = (e: React.DragEvent) =>
    e.dataTransfer.types.includes("Files");
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDropping(false);
    const all = [...e.dataTransfer.files];
    // Several pictures at once: the frames of an animation, as numbered.
    if (all.length > 1 && all.every(isImageFile)) {
      const open = await choiceDialog({
        title: `Open ${all.length} pictures as frames?`,
        message: `They become the frames of a new tile, in the order their names count up (${sequenceOrder(
          all,
        )
          .slice(0, 3)
          .map((f) => f.name)
          .join(
            ", ",
          )}${all.length > 3 ? "…" : ""}). This tile stays saved in My projects.`,
        choices: [{ value: "open", label: "Open as animation" }],
      });
      if (open) file.openFrames(all);
      return;
    }
    const dropped = all[0];
    if (!dropped) return;
    const at = canvas.current?.tilePointAt(e.clientX, e.clientY) ?? null;
    if (!isImageFile(dropped)) {
      const open = await choiceDialog({
        title: "Open this tile?",
        message: `“${dropped.name}” opens in the editor in place of this tile, which stays saved in My projects.`,
        choices: [{ value: "open", label: "Open" }],
      });
      if (open) file.onFileChosen(dropped);
      return;
    }
    const choice = await choiceDialog({
      title: `Add “${dropped.name}”?`,
      message: sprite.canPaint
        ? "Put the picture on this tile where you dropped it, to move into place, or open it as a new tile (this one stays saved in My projects)."
        : "The active layer is hidden or locked, so the picture can only open as a new tile.",
      choices: [
        { value: "new", label: "Open as new tile", variant: "secondary" },
        ...(sprite.canPaint
          ? [{ value: "place" as const, label: "Put on this tile" }]
          : []),
      ],
    });
    if (choice === "new") return file.onFileChosen(dropped);
    if (choice !== "place") return;
    try {
      const { rgba, w, h } = await pictureForTile(dropped, sprite.size);
      // Centred where it was dropped; the paste keeps it on the tile.
      const centre = at ?? { x: sprite.size.w / 2, y: sprite.size.h / 2 };
      const placed = selection.paste({
        x: Math.round(centre.x - w / 2),
        y: Math.round(centre.y - h / 2),
        w,
        h,
        pixels: rgba,
        mask: new Uint8Array(w * h).fill(1),
      });
      if (placed) setTool("move");
    } catch {
      await choiceDialog({
        title: "Couldn’t read the picture",
        message: `“${dropped.name}” isn’t a picture this browser can open. Try a PNG or GIF.`,
        choices: [],
        cancelLabel: "OK",
      });
    }
  };

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
    <div
      className="relative grid h-dvh grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto_minmax(0,1fr)]"
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth.current++;
        setDropping(true);
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        if (!hasFiles(e)) return;
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDropping(false);
      }}
      onDrop={(e) => {
        // The chat box takes pictures dropped on it as attachments.
        if (e.defaultPrevented) {
          dragDepth.current = 0;
          setDropping(false);
        } else if (hasFiles(e)) void onDrop(e);
      }}
    >
      {dropping && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-primary/10 ring-4 ring-primary/40 ring-inset">
          <p className="rounded-xl bg-background px-5 py-3 text-sm font-medium shadow-lg">
            Drop a picture, a .pigxel or an .aseprite file
          </p>
        </div>
      )}
      <EditorHeader
        file={file}
        fileInput={fileInput}
        drive={drive}
        sprite={sprite}
        playback={playback}
        onOpenFrom={setOpening}
        onConnectDrive={connectDrive}
        onExport={() => setExporting(true)}
        onImportSheet={() => sheetInput.current?.click()}
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
          slice={slice}
          onSliceChange={changeSlice}
          onSliceDelete={deleteSlice}
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
          data-guide="canvas"
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
              sliceId={sliceId}
              onSelectSlice={setSliceId}
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
      <input
        ref={sheetInput}
        type="file"
        accept={IMAGE_FILE_TYPES}
        className="hidden"
        onChange={async (e) => {
          const chosen = e.target.files?.[0];
          // Lets the same file be chosen again later.
          e.target.value = "";
          if (!chosen) return;
          try {
            const native = nativeSheet(await readPicture(chosen));
            setSheet({ name: imageBaseName(chosen.name), ...native });
          } catch {
            await choiceDialog({
              title: "Couldn’t read the picture",
              message: `“${chosen.name}” isn’t a picture this browser can open. Try a PNG or GIF.`,
              choices: [],
              cancelLabel: "OK",
            });
          }
        }}
      />
      {sheet && (
        <ImportSheetDialog
          name={sheet.name}
          picture={sheet.picture}
          scale={sheet.scale}
          onImport={(frames) =>
            file.openDocument(documentFromFrames(frames), sheet.name)
          }
          onClose={() => setSheet(null)}
        />
      )}
      {inserting && (
        <AssetPickerDialog
          onPick={insertAsset}
          onClose={() => setInserting(false)}
        />
      )}
      {tutorial && (
        <GuideCoach
          key={tutorial.slug}
          tutorial={tutorial}
          sprite={sprite}
          editor={{
            tool,
            color: pen.color,
            frames: sprite.frames.length,
            onion: view.onion,
            grid: view.gridSize,
            playing: playback.playing,
            exporting,
            floating: selection.floating,
            inserted,
          }}
          onExit={() => router.replace(editorUrl(draft.id))}
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
            slices: sprite.slices,
          }}
          settings={exportSettings}
          onChange={setExportSettings}
          onClose={() => setExporting(false)}
        />
      )}
    </div>
  );
}
