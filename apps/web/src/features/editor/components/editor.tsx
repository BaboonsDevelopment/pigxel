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
import { choiceDialog } from "@/components/ui/confirm-dialog";
import type { Area } from "../pixel-canvas/constants";
import {
  adjustedColors,
  filledMask,
  invertedColors,
  outlinedWith,
  replacedColor,
  type AdjustKind,
} from "../pixel-canvas/effects";
import { rgbaOf, type Axes, type Stamp } from "../pixel-canvas/paint";
import {
  clampPenSize,
  type ColorSlot,
  type PenSettings,
} from "../pixel-canvas/pen";
import {
  PixelCanvas,
  type PixelCanvasHandle,
} from "../pixel-canvas/pixel-canvas";
import {
  borderMask,
  contractMask,
  expandMask,
  maskBounds,
} from "../pixel-canvas/selection";
import {
  copiedPiece,
  pasteSource,
  useSelection,
} from "../pixel-canvas/use-selection";
import {
  DEFAULT_VIEW,
  GRID_SIZES,
  squareGrid,
  ONION_FRAMES,
  SYMMETRY_OPTIONS,
  TILED_OPTIONS,
  type CanvasView,
} from "../pixel-canvas/view";
import type { MenuSections } from "./menu/constants";
import { useSprite, type SpriteApi } from "../pixel-canvas/use-sprite";
import { Timeline } from "../timeline/timeline";
import { usePlayback } from "../timeline/use-playback";
import { TilesetPanel } from "./tileset/tileset-panel";
import { PreviewWindow } from "./preview/preview-window";
import { SecondView } from "./second-view";
import { saveExport } from "../export/save";
import { tilemapFiles } from "../export/tilemap";
import { loadAssetFrame, type Asset } from "@/features/assets/assets";
import { DEFAULT_EXPORT, type ExportSettings } from "../export/constants";
import { decodeImage } from "@/lib/image/decode";
import { connectDriveUrl } from "@/lib/google-drive/status";
import { allLayers, isShown, panelRows } from "@/lib/layers/tree";
import { COLOR_MODES, recolorByPlace } from "@/lib/palette/color-mode";
import { mapToPalette } from "@/lib/palette/reduce";
import { colorsOf, pushRecent } from "@/lib/palette/presets";
import {
  readDraft,
  readPen,
  writePen,
  type Draft,
} from "@/lib/pigxel-file/draft";
import { backgroundColor, type PigxelDocument } from "@/lib/pigxel-file/format";
import { DEFAULT_FRAME_DURATION } from "@/lib/sprite/constants";
import { drawnBounds } from "@/lib/sprite/canvas-size";
import type { TileTransform } from "@/lib/sprite/transform";
import { PIXEL_RATIOS, sameRatio } from "@/lib/sprite/pixel-ratio";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { markTileOpened } from "@/features/tiles/actions";
import { writeMark } from "@/features/tiles/local-marks";
import { openTabAfter, readTabs } from "@/lib/pigxel-file/tabs";
import { thumbnailDataUrl } from "@/lib/pigxel-file/thumbnail";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { useProjectAccess } from "@/features/sharing/queries";
import { useEditLock } from "@/features/sharing/use-edit-lock";
import { loadArtDetails } from "@/features/explore/actions";
import type { PublishTile } from "@/features/explore/components/explore-header/components/publish-dialog";
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
import { findTutorial } from "@/features/tutorials/tutorials";
import {
  DEFAULT_LAYOUT,
  PANELS,
  PANEL_LABELS,
  movePanel,
  movesPanel,
  setPanelCollapsed,
  setPanelShown,
  setToolShown,
  type PanelId,
} from "../layout";
import {
  isStartKind,
  START_PANELS,
  type Command,
  type EditorProps,
  type OpenSource,
  type ToolId,
} from "../constants";
import { isTyping, sizeKey } from "../helpers";
import {
  actionFor,
  keysLabel,
  readKeymap,
  writeKeymap,
  type ActionId,
  type Keymap,
} from "../keymap";
import { keepTile, type KeptTile } from "../kept-tiles";
import { useModifierLabel } from "@/lib/utils/use-modifier-label";
import { usePan } from "../use-pan";
import { useEditorLayout } from "../use-editor-layout";
import {
  readBrushes,
  withBrush,
  writeBrushes,
  type SavedBrush,
} from "../brush-library";
import { useTileFile } from "../use-tile-file";
import { groupOf, toolById } from "../tools";
import { useZoom } from "../use-zoom";
import { ChatPlaceholder } from "./chat-placeholder";
import { ColorsPanel } from "./colors/colors-panel";
import { PaletteActions } from "./colors/palette-actions";
import { PalettePanel } from "./colors/palette-panel";
import { Dock, type PanelContent } from "./dock/dock";
import { DragOverlay } from "./dock/drag-overlay";
import { usePanelDrag } from "./dock/use-panel-drag";
import { EditorHeader } from "./editor-header";
import { GuideCoach } from "./guide-coach";
import { TileTabs } from "./tile-tabs";
import type { ModifyKind } from "./modify-selection-dialog";
import { ToolBar } from "./tool-bar";
import { ToolOptions } from "./tool-options";

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
const CanvasSizeDialog = dynamic(() => import("./canvas-size-dialog"), {
  ssr: false,
});
const SpriteSizeDialog = dynamic(() => import("./sprite-size-dialog"), {
  ssr: false,
});
const ReduceColorsDialog = dynamic(() => import("./reduce-colors-dialog"), {
  ssr: false,
});
const ReplaceColorDialog = dynamic(() => import("./replace-color-dialog"), {
  ssr: false,
});
const OutlineDialog = dynamic(() => import("./outline-dialog"), {
  ssr: false,
});
const ShortcutsDialog = dynamic(() => import("./shortcuts-dialog"), {
  ssr: false,
});
const HistoryDialog = dynamic(() => import("./history-dialog"), {
  ssr: false,
});
const GridDialog = dynamic(() => import("./grid-dialog"), { ssr: false });
const OnionSettingsDialog = dynamic(() => import("./onion-settings-dialog"), {
  ssr: false,
});
const TileSizeDialog = dynamic(() => import("./tileset/tile-size-dialog"), {
  ssr: false,
});
const AdjustColorsDialog = dynamic(() => import("./adjust-colors-dialog"), {
  ssr: false,
});
const CustomizeToolsDialog = dynamic(() => import("./customize-tools-dialog"), {
  ssr: false,
});
const ModifySelectionDialog = dynamic(
  () => import("./modify-selection-dialog"),
  { ssr: false },
);
const PublishArtDialog = dynamic(
  () =>
    import("@/features/explore/components/explore-header/components/publish-dialog").then(
      (m) => m.PublishDialog,
    ),
  { ssr: false },
);
const ShareDialog = dynamic(
  () =>
    import("@/features/sharing/components/share-dialog/share-dialog").then(
      (m) => m.ShareDialog,
    ),
  { ssr: false },
);
const PublishAssetDialog = dynamic(() => import("./publish-asset-dialog"), {
  ssr: false,
});

export function Editor({
  userId,
  drive,
  driveError,
  guide,
  start,
  canPublish,
  draft,
  image,
  kept,
}: EditorProps & {
  draft: Draft;
  image: PigxelDocument;
  kept: KeptTile | null;
}) {
  const router = useRouter();
  const openedTile =
    draft.location?.kind === "cloud" ? draft.location.tile.id : null;
  useEffect(() => {
    if (openedTile) void markTileOpened(openedTile);
    else writeMark(userId, "opened", draft.id, true);
  }, [userId, draft.id, openedTile]);
  const [opening, setOpening] = useState<OpenSource | null>(null);
  const [exporting, setExporting] = useState(false);
  const sheetInput = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<{
    name: string;
    picture: Picture;
    scale: number;
  } | null>(null);
  const [inserting, setInserting] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [scaling, setScaling] = useState(false);
  const [replacing, setReplacing] = useState<{
    pixels: Uint8ClampedArray;
    mask: Uint8Array | null;
  } | null>(null);
  const [outlining, setOutlining] = useState<{
    pixels: Uint8ClampedArray;
    mask: Uint8Array | null;
  } | null>(null);
  const [adjusting, setAdjusting] = useState<{
    kind: AdjustKind;
    pixels: Uint8ClampedArray;
    mask: Uint8Array | null;
  } | null>(null);
  const [reducing, setReducing] = useState<{
    frames: Uint8ClampedArray[];
    picture: Uint8ClampedArray;
  } | null>(null);
  const [modifying, setModifying] = useState<ModifyKind | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishingArt, setPublishingArt] = useState<PublishTile | null>(null);
  const [sharing, setSharing] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [explore, setExplore] = useState<{
    tileId: string;
    published: boolean;
  } | null>(null);
  const [inserted, setInserted] = useState(0);
  const tutorial = findTutorial(guide);
  const [exportSettings, setExportSettings] =
    useState<ExportSettings>(DEFAULT_EXPORT);
  const [tool, setTool] = useState<ToolId>("pen");
  const [layout, setLayout] = useEditorLayout(
    userId,
    isStartKind(start) ? START_PANELS[start] : undefined,
  );
  const panelDrag = usePanelDrag(
    (id, target) => setLayout((l) => movePanel(l, id, target)),
    (id, target) => movesPanel(layout, id, target),
  );
  const [customizing, setCustomizing] = useState(false);
  const toolGroup = groupOf(tool)?.id;
  if (toolGroup && layout.groupTools[toolGroup] !== tool)
    setLayout((l) => ({
      ...l,
      groupTools: { ...l.groupTools, [toolGroup]: tool },
    }));
  const [pen, setPen] = useState<PenSettings>(() => readPen(userId));
  const [view, setView] = useState<CanvasView>(DEFAULT_VIEW);
  const [onionSettings, setOnionSettings] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [gridding, setGridding] = useState(false);
  const [showingHistory, setShowingHistory] = useState(false);
  const [editingKeys, setEditingKeys] = useState(false);
  const [keymap, setKeymap] = useState(() => readKeymap(userId));
  const changeKeymap = (next: Keymap) => {
    setKeymap(next);
    writeKeymap(userId, next);
  };
  const [canvasOnly, setCanvasOnly] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const fullScreened = useRef(false);
  const [tiling, setTiling] = useState<{ convert: boolean } | null>(() =>
    start === "tileset" ? { convert: false } : null,
  );
  const [startedWith] = useState(start);
  useEffect(() => {
    if (isStartKind(start)) router.replace(editorUrl(draft.id));
  }, [start, router, draft.id]);
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [brushes, setBrushes] = useState(() => readBrushes(userId));
  const changeBrushes = (next: SavedBrush[]) => {
    setBrushes(next);
    writeBrushes(userId, next);
  };
  const mod = useModifierLabel();
  const [highlight, setHighlight] = useState<Area | null>(null);
  const canvas = useRef<PixelCanvasHandle>(null);
  const workspace = useRef<HTMLElement>(null);
  const pan = usePan();
  const { scale, zoomIn, zoomOut, zoomReset } = useZoom({
    workspace,
    tileRect: () => canvas.current?.tileRect() ?? null,
    initial: kept?.scale,
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const tile = useRef<SpriteApi>(null);
  const file = useTileFile({
    tile,
    fileInput,
    userId,
    initial: draft,
    drive,
    onOpen: (id) => {
      openTabAfter(userId, id, draft.id);
      router.push(editorUrl(id));
    },
    notice: driveError
      ? {
          tone: "error",
          text: "Google Drive wasn’t connected. Try again when you’re ready.",
        }
      : undefined,
  });
  const cloudTile = file.location?.kind === "cloud" ? file.location.tile : null;
  const cloudTileId = cloudTile?.id;
  useEffect(() => {
    if (!cloudTileId) return;
    let live = true;
    loadArtDetails(cloudTileId).then(
      (details) => {
        if (live && details)
          setExplore({ tileId: cloudTileId, published: details.published });
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [cloudTileId]);
  const published =
    !!cloudTileId && explore?.tileId === cloudTileId && explore.published;
  const access = useProjectAccess(cloudTileId ?? null);
  const owner = !cloudTileId || access === undefined || access === "owner";
  const heldBy = useEditLock(
    cloudTileId && (access === "owner" || access === "editor")
      ? cloudTileId
      : null,
  );
  const removed = !!cloudTileId && access === null;
  const { setPause } = file;
  useEffect(
    () =>
      setPause(
        removed
          ? "You no longer have access to this project, so it’s view-only now."
          : heldBy
            ? `${heldBy} is editing now. Your changes here won’t be saved.`
            : null,
      ),
    [setPause, removed, heldBy],
  );

  const sprite = useSprite(image, file.markDirty, kept?.sprite, removed);
  const layerIds = allLayers(sprite.tree).map((layer) => layer.id);
  const [seenLayers, setSeenLayers] = useState(layerIds);
  if (seenLayers.join() !== layerIds.join()) {
    setSeenLayers(layerIds);
    if (
      !seenLayers.includes(sprite.layerId) &&
      layerIds.includes(sprite.layerId) &&
      seenLayers.every((id) => layerIds.includes(id))
    )
      setLayout((l) =>
        setPanelCollapsed(
          setPanelShown(l, "timeline", true),
          "timeline",
          false,
        ),
      );
  }
  const tilemapKey =
    sprite.activeLayer?.kind === "tilemap" ? sprite.layerId : null;
  const [seenTilemap, setSeenTilemap] = useState(tilemapKey);
  if (seenTilemap !== tilemapKey) {
    setSeenTilemap(tilemapKey);
    if (tilemapKey)
      setLayout((l) =>
        setPanelCollapsed(setPanelShown(l, "tileset", true), "tileset", false),
      );
  }
  const latestScale = useRef(scale);
  useLayoutEffect(() => {
    tile.current = sprite;
    latestScale.current = scale;
  });
  useEffect(
    () => () => {
      const left = tile.current;
      const saved = readDraft(userId, draft.id);
      if (!left || !saved || !readTabs(userId).includes(draft.id)) return;
      const sprite = left.keep();
      const now = sprite.history.present;
      keepTile(draft.id, {
        sprite,
        image: {
          id: image.id,
          background: image.background,
          width: now.size.w,
          height: now.size.h,
          layers: now.tree,
          frames: now.frames,
          cels: now.cels,
          palette: now.palette,
          slices: now.slices,
          colorMode: now.colorMode,
          pixelRatio: now.pixelRatio,
        },
        scale: latestScale.current,
        savedAt: saved.savedAt,
      });
    },
    [userId, draft.id, image],
  );
  const playback = usePlayback(sprite);
  const selection = useSelection(sprite);

  const [sliceId, setSliceId] = useState<string | null>(null);
  const slice = sprite.slices.find((s) => s.id === sliceId) ?? null;
  const changeSlice = (next: Slice) =>
    sprite.setSlices(sprite.slices.map((s) => (s.id === next.id ? next : s)));
  const deleteSlice = () => {
    if (slice) sprite.setSlices(sprite.slices.filter((s) => s !== slice));
    setSliceId(null);
  };

  useEffect(() => writePen(userId, pen), [userId, pen]);

  const connectDrive = () =>
    window.location.assign(connectDriveUrl(editorUrl(draft.id)));

  const resizePen = (step: 1 | -1) => {
    const key = sizeKey(tool);
    if (key) setPen((p) => ({ ...p, [key]: clampPenSize(p[key] + step) }));
  };

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
    undo: () => {
      if (!selection.cancel()) sprite.undo();
    },
    redo: () => {
      if (!selection.floating) sprite.redo();
    },
    zoomIn,
    zoomOut,
    zoomReset,
    layerAbove: () => selectLayer(-1),
    layerBelow: () => selectLayer(1),
    newLayer: () => sprite.addLayer("normal"),
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
    reselect: selection.reselect,
    invertSelection: selection.invert,
    copy: () => void selection.copy(),
    cut: () => {
      if (selection.copy()) selection.clear();
    },
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
    togglePreview: () => setPreviewing((on) => !on),
    toggleCanvasOnly: () => setCanvasOnly((on) => !on),
    toggleFullScreen: () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
        return;
      }
      fullScreened.current = true;
      setCanvasOnly(true);
      void document.documentElement.requestFullscreen().catch(() => {
        fullScreened.current = false;
      });
    },
  };

  const applyEffect = (
    change: (
      pixels: Uint8ClampedArray,
      mask: Uint8Array | null,
    ) => Uint8ClampedArray,
  ) => {
    selection.drop();
    sprite.editCel((pixels) => change(pixels, selection.mask));
  };

  const adjust = (kind: AdjustKind) => {
    selection.drop();
    setAdjusting({
      kind,
      pixels: new Uint8ClampedArray(
        sprite.readCel(sprite.layerId, sprite.frameId),
      ),
      mask: selection.mask,
    });
  };

  const pasteAsNewLayer = () => {
    const piece = copiedPiece();
    if (!piece) return;
    selection.drop();
    const { w, h } = sprite.size;
    const keepIn = (pos: number, len: number, max: number) =>
      len >= max ? 0 : Math.max(0, Math.min(max - len, pos));
    const left = keepIn(piece.x, piece.w, w);
    const top = keepIn(piece.y, piece.h, h);
    const pixels = new Uint8ClampedArray(w * h * 4);
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < piece.h && top + y < h; y++)
      for (let x = 0; x < piece.w && left + x < w; x++) {
        const j = y * piece.w + x;
        const i = (top + y) * w + left + x;
        pixels.set(piece.pixels.subarray(j * 4, j * 4 + 4), i * 4);
        mask[i] = piece.mask[j]!;
      }
    sprite.addLayer("normal", { cels: new Map([[sprite.frameId, pixels]]) });
    selection.select(mask);
    setTool("move");
  };

  const pasteAsNewTile = () => {
    const piece = copiedPiece();
    if (!piece) return;
    file.openDocument(
      documentFromFrames({
        w: piece.w,
        h: piece.h,
        frames: [{ rgba: piece.pixels, duration: DEFAULT_FRAME_DURATION }],
      }),
      `${file.name} pasted`,
    );
  };

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

  const insertAsset = async (asset: Asset): Promise<string | null> => {
    let frame;
    try {
      frame = await loadAssetFrame(asset);
    } catch {
      return "Couldn’t load this asset. Try again.";
    }
    const { pixels, w, h } = frame;
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
    if (!placed)
      return "This layer can’t be drawn on. Pick an unlocked, visible layer first.";
    setTool("move");
    setInserted((n) => n + 1);
    return null;
  };

  const cropTo = (area: { x: number; y: number; w: number; h: number }) => {
    selection.deselect();
    sprite.resize({ w: area.w, h: area.h }, { x: -area.x, y: -area.y });
  };
  const cropToSelection = () => {
    const area = selection.mask && maskBounds(selection.mask, sprite.size);
    if (area) cropTo(area);
  };
  const trim = async () => {
    const fill = backgroundColor(sprite.background);
    const area = drawnBounds(
      sprite.frames.map((f) => sprite.composite(["reference"], f.id)),
      sprite.size.w,
      sprite.size.h,
      fill ? (rgbaOf(fill).slice(0, 3) as [number, number, number]) : null,
    );
    if (area && (area.w < sprite.size.w || area.h < sprite.size.h))
      return cropTo(area);
    await choiceDialog({
      title: "Nothing to trim",
      message: area
        ? "The drawing already reaches every edge of the tile."
        : "Nothing is drawn on the tile yet.",
      choices: [],
      cancelLabel: "OK",
    });
  };

  const keyOf = (id: ActionId) => keysLabel(keymap, id, mod);
  const check = (on: boolean, label: string) => `${on ? "✓ " : ""}${label}`;
  const editMenu: MenuSections = [
    [
      {
        label: "Undo",
        shortcut: keyOf("command:undo"),
        onSelect: commands.undo,
      },
      {
        label: "Redo",
        shortcut: keyOf("command:redo"),
        onSelect: commands.redo,
      },
      { label: "History…", onSelect: () => setShowingHistory(true) },
      { label: "Keyboard shortcuts…", onSelect: () => setEditingKeys(true) },
    ],
    [
      { label: "Cut", shortcut: keyOf("command:cut"), onSelect: commands.cut },
      {
        label: "Copy",
        shortcut: keyOf("command:copy"),
        onSelect: commands.copy,
      },
      { label: "Paste", shortcut: `${mod}V`, onSelect: commands.paste },
      { label: "Paste as new layer", onSelect: pasteAsNewLayer },
      { label: "Paste as new tile", onSelect: pasteAsNewTile },
      {
        label: "Delete",
        shortcut: keyOf("command:clearLayer"),
        onSelect: commands.clearLayer,
      },
    ],
    [{ label: "Insert asset…", onSelect: () => setInserting(true) }],
    [
      {
        label: "Transform",
        submenu: [
          [
            {
              label: "Flip horizontally",
              shortcut: keyOf("command:flipHorizontal"),
              onSelect: commands.flipHorizontal,
            },
            {
              label: "Flip vertically",
              shortcut: keyOf("command:flipVertical"),
              onSelect: commands.flipVertical,
            },
          ],
          [
            { label: "Rotate 90° right", onSelect: commands.rotateRight },
            {
              label: "Rotate 90° left",
              onSelect: () => selection.transform("rotateLeft"),
            },
          ],
        ],
      },
      {
        label: "Paint",
        submenu: [
          [
            {
              label: "Fill selection with primary colour",
              onSelect: () =>
                applyEffect((pixels, mask) =>
                  mask ? filledMask(pixels, mask, rgbaOf(pen.color)) : pixels,
                ),
              disabled: !selection.mask || !sprite.canPaint,
            },
            {
              label: "Stroke selection…",
              onSelect: () => setModifying("stroke"),
              disabled: !selection.mask || !sprite.canPaint,
            },
          ],
          [
            {
              label: "Outline…",
              onSelect: () => {
                selection.drop();
                setOutlining({
                  pixels: new Uint8ClampedArray(
                    sprite.readCel(sprite.layerId, sprite.frameId),
                  ),
                  mask: selection.mask,
                });
              },
              disabled: !sprite.canPaint,
            },
            {
              label: "Replace colour…",
              onSelect: () => {
                selection.drop();
                setReplacing({
                  pixels: new Uint8ClampedArray(
                    sprite.readCel(sprite.layerId, sprite.frameId),
                  ),
                  mask: selection.mask,
                });
              },
              disabled: !sprite.canPaint,
            },
          ],
        ],
      },
      {
        label: "Adjust",
        submenu: [
          [
            {
              label: "Hue / Saturation…",
              onSelect: () => adjust("hueSaturation"),
              disabled: !sprite.canPaint,
            },
            {
              label: "Brightness / Contrast…",
              onSelect: () => adjust("brightnessContrast"),
              disabled: !sprite.canPaint,
            },
            {
              label: "Colour curve…",
              onSelect: () => adjust("curve"),
              disabled: !sprite.canPaint,
            },
          ],
          [
            {
              label: "Invert colours",
              onSelect: () => applyEffect(invertedColors),
              disabled: !sprite.canPaint,
            },
            {
              label: "Despeckle…",
              onSelect: () => adjust("despeckle"),
              disabled: !sprite.canPaint,
            },
            {
              label: "Convolution matrix…",
              onSelect: () => adjust("convolution"),
              disabled: !sprite.canPaint,
            },
          ],
        ],
      },
      {
        label: "Brush",
        submenu: [
          [
            {
              label: "Use selection as brush",
              onSelect: useAsBrush,
              disabled: !selection.mask,
            },
            {
              label: "Back to the normal brush",
              onSelect: () => setStamp(null),
              disabled: !stamp,
            },
          ],
        ],
      },
    ],
  ];
  const selectMenu: MenuSections = [
    [
      {
        label: "Select all",
        shortcut: keyOf("command:selectAll"),
        onSelect: commands.selectAll,
      },
      {
        label: "Deselect",
        shortcut: keyOf("command:deselect"),
        onSelect: commands.deselect,
        disabled: !selection.mask,
      },
      {
        label: "Invert",
        shortcut: keyOf("command:invertSelection"),
        onSelect: commands.invertSelection,
      },
      {
        label: "Reselect",
        shortcut: keyOf("command:reselect"),
        onSelect: commands.reselect,
        disabled: !selection.canReselect,
      },
    ],
    [
      {
        label: "Modify",
        disabled: !selection.mask,
        submenu: [
          [
            { label: "Expand…", onSelect: () => setModifying("expand") },
            { label: "Contract…", onSelect: () => setModifying("contract") },
            { label: "Border…", onSelect: () => setModifying("border") },
          ],
        ],
      },
    ],
    [
      {
        label: "Save selection",
        onSelect: selection.saveSelection,
        disabled: !selection.mask,
      },
      {
        label: "Load saved selection",
        onSelect: selection.loadSelection,
        disabled: !selection.hasSaved,
      },
    ],
  ];
  const transformTile = (t: TileTransform) => {
    selection.deselect();
    sprite.transformAll(t);
  };
  const tileMenu: MenuSections = [
    [
      { label: "Canvas size…", onSelect: () => setResizing(true) },
      { label: "Sprite size…", onSelect: () => setScaling(true) },
    ],
    [
      {
        label: "Crop to selection",
        onSelect: cropToSelection,
        disabled: !selection.mask,
      },
      { label: "Trim empty edges", onSelect: () => void trim() },
    ],
    [
      {
        label: "Rotate",
        submenu: [
          [
            {
              label: "90° right",
              onSelect: () => transformTile("rotateRight"),
            },
            { label: "90° left", onSelect: () => transformTile("rotateLeft") },
            { label: "180°", onSelect: () => transformTile("rotate180") },
          ],
        ],
      },
      {
        label: "Flip",
        submenu: [
          [
            {
              label: "Horizontally",
              onSelect: () => transformTile("flipHorizontal"),
            },
            {
              label: "Vertically",
              onSelect: () => transformTile("flipVertical"),
            },
          ],
        ],
      },
    ],
    [
      {
        label: "Reduce colours…",
        onSelect: () =>
          setReducing({
            frames: sprite.frames.map((f) =>
              sprite.composite(["reference"], f.id),
            ),
            picture: sprite.composite(["reference"]),
          }),
      },
      {
        label: "Colour mode",
        submenu: [
          COLOR_MODES.map(({ value, label }) => ({
            label: check(sprite.colorMode === value, label),
            onSelect: () => {
              selection.deselect();
              sprite.setColorMode(value);
            },
          })),
        ],
      },
      {
        label: "Pixel ratio",
        submenu: [
          PIXEL_RATIOS.map(({ ratio, label }) => ({
            label: check(sameRatio(sprite.pixelRatio, ratio), label),
            onSelect: () => sprite.setPixelRatio(ratio),
          })),
        ],
      },
    ],
  ];
  const viewMenu: MenuSections = [
    [
      {
        label: check(canvasOnly, "Canvas only"),
        shortcut: keyOf("command:toggleCanvasOnly"),
        onSelect: commands.toggleCanvasOnly,
      },
      {
        label: "Full screen",
        shortcut: keyOf("command:toggleFullScreen"),
        onSelect: commands.toggleFullScreen,
      },
    ],
    [
      {
        label: check(splitView, "Second view"),
        onSelect: () => setSplitView((on) => !on),
      },
      {
        label: check(previewing, "Preview window"),
        shortcut: keyOf("command:togglePreview"),
        onSelect: commands.togglePreview,
      },
    ],
    [
      {
        label: check(view.onion > 0, "Onion skin"),
        shortcut: keyOf("command:toggleOnion"),
        onSelect: commands.toggleOnion,
      },
      {
        label: "Onion frames",
        submenu: [
          ONION_FRAMES.map((count) => ({
            label: check(
              view.onion === count,
              `${count} frame${count > 1 ? "s" : ""} each way`,
            ),
            onSelect: () => setView((v) => ({ ...v, onion: count })),
          })),
        ],
      },
      {
        label: "Onion skin settings…",
        onSelect: () => {
          setView((v) => ({ ...v, onion: v.onion || 1 }));
          setOnionSettings(true);
        },
      },
    ],
    [
      {
        label: check(view.pixelGrid, "Pixel grid"),
        onSelect: () => setView((v) => ({ ...v, pixelGrid: !v.pixelGrid })),
      },
      {
        label: "Grid",
        submenu: [
          [
            {
              label: check(!view.grid, "No grid"),
              onSelect: () => setView((v) => ({ ...v, grid: null })),
            },
            ...GRID_SIZES.map((n) => ({
              label: check(
                !!view.grid &&
                  view.grid.w === n &&
                  view.grid.h === n &&
                  !view.grid.x &&
                  !view.grid.y,
                `${n} × ${n}`,
              ),
              onSelect: () => setView((v) => ({ ...v, grid: squareGrid(n) })),
            })),
          ],
          [
            {
              label: "Custom…",
              onSelect: () => setGridding(true),
            },
          ],
        ],
      },
      {
        label: check(view.snap && !!view.grid, "Snap to grid"),
        onSelect: () => setView((v) => ({ ...v, snap: !v.snap })),
        disabled: !view.grid,
      },
    ],
    [
      {
        label: "Mirror",
        submenu: [
          SYMMETRY_OPTIONS.map(([value, label]) => ({
            label: check(view.symmetry === value, label),
            onSelect: () => setView((v) => ({ ...v, symmetry: value })),
          })),
          [
            {
              label: "Back to the middle",
              onSelect: () => setView((v) => ({ ...v, axes: null })),
              disabled: !view.axes,
            },
          ],
        ],
      },
      {
        label: "Tiled",
        submenu: [
          TILED_OPTIONS.map(([value, label]) => ({
            label: check(view.tiled === value, label),
            onSelect: () => setView((v) => ({ ...v, tiled: value })),
          })),
        ],
      },
    ],
  ];
  const windowMenu: MenuSections = [
    PANELS.map((id) => ({
      label: check(!layout.hidden.includes(id), PANEL_LABELS[id]),
      onSelect: () =>
        setLayout((l) => setPanelShown(l, id, l.hidden.includes(id))),
    })),
    [
      { label: "Customize tools…", onSelect: () => setCustomizing(true) },
      { label: "Reset layout", onSelect: () => setLayout(DEFAULT_LAYOUT) },
    ],
  ];

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
      } catch {}
    }
    if (selection.paste(pasteSource(image))) setTool("move");
  });

  const [dropping, setDropping] = useState(false);
  const dragDepth = useRef(0);
  const hasFiles = (e: React.DragEvent) =>
    e.dataTransfer.types.includes("Files");
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDropping(false);
    const all = [...e.dataTransfer.files];
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
    const shortcut = actionFor(e, keymap, isTyping(e.target));
    if (!shortcut) return;
    e.preventDefault();
    if ("tool" in shortcut) setTool(shortcut.tool);
    else commands[shortcut.command]();
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onChange = () => {
      if (document.fullscreenElement || !fullScreened.current) return;
      fullScreened.current = false;
      setCanvasOnly(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const changePalette = (
    next: string[],
    change?: { edited?: { from: string; to: string }; loaded?: boolean },
  ) => {
    const edited = change?.edited;
    sprite.setPalette(
      next,
      edited
        ? new Map([[edited.from, edited.to]])
        : change?.loaded
          ? recolorByPlace(sprite.palette, next)
          : undefined,
    );
    if (edited)
      setPen((p) => ({
        ...p,
        color: p.color === edited.from ? edited.to : p.color,
        secondary: p.secondary === edited.from ? edited.to : p.secondary,
      }));
  };
  const canvasProps = {
    tool: toolById(tool),
    pen,
    sprite,
    selection,
    view,
    stamp,
    highlight,
    onTextPlaced: () => setTool("move"),
    sliceId,
    onSelectSlice: setSliceId,
    onAxesChange: (axes: Axes | null) => setView((v) => ({ ...v, axes })),
    onPickColor: (color: string, slot: ColorSlot) =>
      setPen((p) =>
        slot === "primary" ? { ...p, color } : { ...p, secondary: color },
      ),
    onUseColor: (color: string) =>
      setPen((p) =>
        p.recent[0] === color
          ? p
          : { ...p, recent: pushRecent(p.recent, color) },
      ),
  };

  const panels: Record<PanelId, PanelContent> = {
    tools: {
      body: (
        <ToolBar
          tool={tool}
          onSelect={setTool}
          hiddenTools={layout.hiddenTools}
          groupTools={layout.groupTools}
          keyOf={(id) => keyOf(`tool:${id}`)}
        />
      ),
    },
    colors: { body: <ColorsPanel pen={pen} onChange={setPen} /> },
    palette: {
      actions: (
        <PaletteActions
          pen={pen}
          palette={sprite.palette}
          onPaletteChange={changePalette}
          frameColors={() => colorsOf(sprite.composite(["reference"]))}
          fileName={file.name}
        />
      ),
      body: (
        <PalettePanel
          pen={pen}
          onChange={setPen}
          palette={sprite.palette}
          colorMode={sprite.colorMode}
          onPaletteChange={changePalette}
        />
      ),
    },
    tileset: {
      body: (
        <TilesetPanel
          sprite={sprite}
          onNewTilemap={(convert) => setTiling({ convert })}
          onPickTile={() => setTool("tile")}
          onExport={() => void saveExport(tilemapFiles(sprite, file.name))}
        />
      ),
    },
    timeline: {
      fill: true,
      body: (
        <Timeline
          sprite={sprite}
          playback={playback}
          onTilemap={(convert) => setTiling({ convert })}
        />
      ),
    },
    assistant: {
      fill: true,
      body: (
        <EditorChat
          autoFocus={startedWith === "ai"}
          canvas={canvas}
          sprite={sprite}
          playback={playback}
          onHighlight={setHighlight}
        />
      ),
    },
  };
  const dockProps = { layout, panels, drag: panelDrag, setLayout };

  return (
    <div
      className="relative flex h-dvh flex-col"
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
        if (e.defaultPrevented) {
          dragDepth.current = 0;
          setDropping(false);
        } else if (hasFiles(e)) void onDrop(e);
      }}
    >
      {dropping && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-primary/10 ring-4 ring-primary/40 ring-inset">
          <p className="rounded-xl bg-background px-5 py-3 text-sm font-medium shadow-lg">
            Drop a picture or a .pigxel file
          </p>
        </div>
      )}
      {canvasOnly && (
        <button
          type="button"
          title="Show the menus and panels again (Tab)"
          onClick={() => {
            setCanvasOnly(false);
            if (document.fullscreenElement) void document.exitFullscreen();
          }}
          className="absolute top-3 right-3 z-30 rounded-md border bg-background/90 px-2.5 py-1 text-xs text-muted-foreground shadow-sm hover:text-foreground"
        >
          Show panels · Tab
        </button>
      )}
      <EditorHeader
        hidden={canvasOnly}
        draftId={draft.id}
        file={file}
        fileInput={fileInput}
        drive={drive}
        sprite={sprite}
        playback={playback}
        onOpenFrom={setOpening}
        onConnectDrive={connectDrive}
        onExport={() => setExporting(true)}
        onPublish={canPublish ? () => setPublishing(true) : undefined}
        explorePublished={published}
        renameLocked={!owner}
        onPublishArt={
          owner && (cloudTile || !file.location)
            ? async () => {
                const target = cloudTile ?? (await file.saveToCloudFirst());
                if (!target) return;
                const image = sprite.document();
                setPublishingArt({
                  id: target.id,
                  name: file.name,
                  width: image.width,
                  height: image.height,
                  thumbnail: thumbnailDataUrl(image),
                });
              }
            : undefined
        }
        onShare={
          owner && (cloudTile || !file.location)
            ? async () => {
                if (cloudTile)
                  return setSharing({ id: cloudTile.id, name: file.name });
                const confirmed = await confirmDialog({
                  title: "Save to Pigxel cloud first?",
                  message: `Only cloud projects can be shared, so “${file.name}” will be saved to Pigxel cloud first.`,
                  confirmLabel: "Save and share",
                });
                if (!confirmed) return;
                const target = await file.saveToCloudFirst();
                if (target) setSharing({ id: target.id, name: file.name });
              }
            : undefined
        }
        onImportSheet={() => sheetInput.current?.click()}
        onTilemap={(convert) => setTiling({ convert })}
        keyOf={keyOf}
        menus={[
          { label: "Edit", sections: editMenu },
          { label: "Select", sections: selectMenu },
          { label: "Tile", sections: tileMenu },
          { label: "View", sections: viewMenu },
        ]}
        afterMenus={[{ label: "Window", sections: windowMenu }]}
      />
      <div
        hidden={canvasOnly}
        className="flex min-h-12 shrink-0 items-center border-b bg-background px-4 py-2"
      >
        <ToolOptions
          tool={toolById(tool)}
          pen={pen}
          onChange={setPen}
          selection={selection}
          stamp={stamp}
          onClearStamp={() => setStamp(null)}
          onUseAsBrush={useAsBrush}
          brushes={brushes}
          onSaveBrush={() =>
            stamp &&
            changeBrushes(withBrush(brushes, stamp, crypto.randomUUID()))
          }
          onPickBrush={setStamp}
          onRemoveBrush={(id) =>
            changeBrushes(brushes.filter((b) => b.id !== id))
          }
          slice={slice}
          onSliceChange={changeSlice}
          onSliceDelete={deleteSlice}
        />
      </div>
      <div className="flex min-h-0 flex-1">
        <div hidden={canvasOnly} className="contents">
          <Dock side="left" {...dockProps} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TileTabs
            hidden={canvasOnly}
            userId={userId}
            current={{
              id: draft.id,
              name: file.name,
              dirty: file.dirty,
              location: file.location,
            }}
            revision={file.revision}
            picture={() => ({
              rgba: sprite.composite(["reference"], sprite.frames[0]!.id),
              w: sprite.size.w,
              h: sprite.size.h,
            })}
          />
          <div className="flex min-h-0 flex-1">
            <div hidden={canvasOnly} className="contents">
              <Dock side="innerLeft" {...dockProps} />
            </div>
            <main
              ref={workspace}
              data-guide="canvas"
              data-canvas-drop
              {...pan.handlers}
              className={cn(
                "flex min-h-0 min-w-0 flex-1 overflow-auto bg-muted p-12",
                pan.panning && "cursor-grab [&_*]:cursor-grab!",
              )}
            >
              <div className="m-auto">
                <PixelCanvas ref={canvas} scale={scale} {...canvasProps} />
              </div>
            </main>
            {splitView && (
              <SecondView
                canvas={canvasProps}
                onClose={() => setSplitView(false)}
              />
            )}
            <div hidden={canvasOnly} className="contents">
              <Dock side="innerRight" {...dockProps} />
            </div>
          </div>
          <div hidden={canvasOnly} className="contents">
            <Dock side="bottom" {...dockProps} />
          </div>
        </div>
        <div hidden={canvasOnly} className="contents">
          <Dock side="right" {...dockProps} />
        </div>
      </div>
      <DragOverlay drag={panelDrag} />
      {customizing && (
        <CustomizeToolsDialog
          keyOf={(id) => keyOf(`tool:${id}`)}
          hiddenTools={layout.hiddenTools}
          onChange={(id, shown) => setLayout((l) => setToolShown(l, id, shown))}
          onClose={() => setCustomizing(false)}
        />
      )}
      {opening && (
        <OpenTileDialog
          source={opening}
          drive={drive}
          draftId={draft.id}
          file={file}
          onClose={() => setOpening(null)}
        />
      )}
      {publishingArt && (
        <PublishArtDialog
          tile={publishingArt}
          onPublished={() =>
            setExplore({ tileId: publishingArt.id, published: true })
          }
          onUnpublished={() =>
            setExplore({ tileId: publishingArt.id, published: false })
          }
          onClose={() => setPublishingArt(null)}
        />
      )}
      {sharing && (
        <ShareDialog tile={sharing} onClose={() => setSharing(null)} />
      )}
      {publishing && (
        <PublishAssetDialog
          name={file.name}
          document={sprite.document}
          onClose={() => setPublishing(false)}
        />
      )}
      <input
        ref={sheetInput}
        type="file"
        accept={IMAGE_FILE_TYPES}
        className="hidden"
        onChange={async (e) => {
          const chosen = e.target.files?.[0];
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
      {modifying && (
        <ModifySelectionDialog
          kind={modifying}
          onApply={(by, shape) => {
            const mask = selection.mask;
            if (!mask) return;
            if (modifying === "stroke")
              return applyEffect((pixels) =>
                filledMask(
                  pixels,
                  borderMask(mask, sprite.size, by, shape),
                  rgbaOf(pen.color),
                ),
              );
            const modify =
              modifying === "expand"
                ? expandMask
                : modifying === "contract"
                  ? contractMask
                  : borderMask;
            const next = modify(mask, sprite.size, by, shape);
            selection.select(next.some(Boolean) ? next : null);
          }}
          onClose={() => setModifying(null)}
        />
      )}
      {replacing && (
        <ReplaceColorDialog
          size={sprite.size}
          pixels={replacing.pixels}
          mask={replacing.mask}
          palette={sprite.palette}
          from={pen.color}
          to={pen.secondary}
          onApply={({ from, to, tolerance, keepShading }) =>
            applyEffect((pixels, mask) =>
              replacedColor(
                pixels,
                rgbaOf(from),
                rgbaOf(to),
                mask,
                tolerance,
                keepShading,
              ),
            )
          }
          onClose={() => setReplacing(null)}
        />
      )}
      {tiling && (
        <TileSizeDialog
          convert={tiling.convert}
          onApply={(tile) => {
            selection.deselect();
            if (tiling.convert) sprite.convertToTilemap(sprite.layerId, tile);
            else sprite.addTilemapLayer(tile);
          }}
          onClose={() => setTiling(null)}
        />
      )}
      {editingKeys && (
        <ShortcutsDialog
          keymap={keymap}
          mod={mod}
          onChange={changeKeymap}
          onClose={() => setEditingKeys(false)}
        />
      )}
      {showingHistory && (
        <HistoryDialog
          {...sprite.historySteps()}
          onPick={(index) => {
            selection.cancel();
            sprite.goToStep(index);
          }}
          onClose={() => setShowingHistory(false)}
        />
      )}
      {gridding && (
        <GridDialog
          grid={view.grid}
          look={view.gridLook}
          onChange={(grid, gridLook) =>
            setView((v) => ({ ...v, grid, gridLook }))
          }
          onClose={() => setGridding(false)}
        />
      )}
      {previewing && (
        <PreviewWindow sprite={sprite} onClose={() => setPreviewing(false)} />
      )}
      {onionSettings && (
        <OnionSettingsDialog
          settings={view.onionSettings}
          onChange={(next) => setView((v) => ({ ...v, onionSettings: next }))}
          onClose={() => setOnionSettings(false)}
        />
      )}
      {outlining && (
        <OutlineDialog
          size={sprite.size}
          pixels={outlining.pixels}
          mask={outlining.mask}
          palette={sprite.palette}
          color={pen.color}
          onApply={({ color, ...settings }) =>
            applyEffect((pixels, mask) =>
              outlinedWith(pixels, sprite.size, rgbaOf(color), mask, settings),
            )
          }
          onClose={() => setOutlining(null)}
        />
      )}
      {adjusting && (
        <AdjustColorsDialog
          kind={adjusting.kind}
          size={sprite.size}
          pixels={adjusting.pixels}
          mask={adjusting.mask}
          onApply={(settings) =>
            applyEffect((pixels, mask) =>
              adjustedColors(
                adjusting.kind,
                pixels,
                mask,
                sprite.size,
                settings,
              ),
            )
          }
          onClose={() => setAdjusting(null)}
        />
      )}
      {reducing && (
        <ReduceColorsDialog
          size={sprite.size}
          frames={reducing.frames}
          picture={reducing.picture}
          palette={sprite.palette}
          onApply={({ palette, dither, replacePalette }) => {
            selection.deselect();
            sprite.mapAllCels(
              (rgba) => mapToPalette(rgba, sprite.size.w, palette, dither),
              replacePalette ? palette : undefined,
            );
          }}
          onClose={() => setReducing(null)}
        />
      )}
      {scaling && (
        <SpriteSizeDialog
          size={sprite.size}
          picture={sprite.composite(["reference"])}
          onApply={(next, method) => {
            selection.deselect();
            sprite.rescale(next, method);
          }}
          onClose={() => setScaling(false)}
        />
      )}
      {resizing && (
        <CanvasSizeDialog
          size={sprite.size}
          picture={sprite.composite(["reference"])}
          onApply={(next, offset) => {
            selection.deselect();
            sprite.resize(next, offset);
          }}
          onClose={() => setResizing(false)}
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
            grid: view.grid?.w ?? 0,
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
            tags: sprite.tags,
            frameId: sprite.frameId,
            background: sprite.background,
            picture: (id) => sprite.composite(["reference"], id),
            stages: (id) => sprite.buildUp(["reference"], id),
            layers: allLayers(sprite.tree)
              .filter(
                (layer) =>
                  layer.kind !== "group" &&
                  layer.kind !== "reference" &&
                  isShown(sprite.tree, layer.id),
              )
              .map((layer) => ({
                id: layer.id,
                name: layer.name,
                picture: (id: string) => sprite.readCel(layer.id, id),
              })),
            compose: sprite.compositeOf,
            selection: selection.mask,
            slices: sprite.slices,
          }}
          pixelRatio={sprite.pixelRatio}
          settings={exportSettings}
          onChange={setExportSettings}
          onClose={() => setExporting(false)}
        />
      )}
    </div>
  );
}
