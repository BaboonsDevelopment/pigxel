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
import type { Area } from "@/components/pixel-canvas/constants";
import {
  filledMask,
  outlined,
  replacedColor,
} from "@/components/pixel-canvas/effects";
import { rgbaOf, type Stamp } from "@/components/pixel-canvas/paint";
import { clampPenSize, type PenSettings } from "@/components/pixel-canvas/pen";
import {
  PixelCanvas,
  type PixelCanvasHandle,
} from "@/components/pixel-canvas/pixel-canvas";
import {
  borderMask,
  contractMask,
  expandMask,
  maskBounds,
} from "@/components/pixel-canvas/selection";
import {
  pasteSource,
  useSelection,
} from "@/components/pixel-canvas/use-selection";
import {
  DEFAULT_VIEW,
  GRID_SIZES,
  ONION_FRAMES,
  SYMMETRY_OPTIONS,
  TILED_OPTIONS,
  type CanvasView,
} from "@/components/pixel-canvas/view";
import type { MenuSections } from "@/components/menu/constants";
import {
  useSprite,
  type SpriteApi,
} from "@/components/pixel-canvas/use-sprite";
import { Timeline } from "@/components/timeline/timeline";
import { usePlayback } from "@/components/timeline/use-playback";
import { loadAssetFrame, type Asset } from "@/lib/assets/assets";
import { DEFAULT_EXPORT, type ExportSettings } from "@/lib/export/constants";
import { decodeImage } from "@/lib/image/decode";
import { connectDriveUrl } from "@/lib/google-drive/status";
import { panelRows } from "@/lib/layers/tree";
import { COLOR_MODES, recolorByPlace } from "@/lib/palette/color-mode";
import { colorsOf, pushRecent } from "@/lib/palette/presets";
import {
  readDraft,
  readPen,
  writePen,
  type Draft,
} from "@/lib/pigxel-file/draft";
import { backgroundColor, type PigxelDocument } from "@/lib/pigxel-file/format";
import { drawnBounds } from "@/lib/sprite/canvas-size";
import type { TileTransform } from "@/lib/sprite/transform";
import { PIXEL_RATIOS, sameRatio } from "@/lib/sprite/pixel-ratio";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { openTabAfter, readTabs } from "@/lib/pigxel-file/tabs";
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
import {
  DEFAULT_LAYOUT,
  PANELS,
  PANEL_LABELS,
  movePanel,
  setPanelShown,
  setToolShown,
  type PanelId,
} from "@/lib/editor-layout/layout";
import type { Command, EditorProps, OpenSource, ToolId } from "../constants";
import { isTyping, shortcutFor, sizeKey } from "../helpers";
import { keepTile, type KeptTile } from "../kept-tiles";
import { useModifierLabel } from "../use-modifier-label";
import { usePan } from "../use-pan";
import { useEditorLayout } from "../use-editor-layout";
import { useTileFile } from "../use-tile-file";
import { groupOf, toolById } from "../tools";
import { useZoom } from "../use-zoom";
import { ChatPlaceholder } from "./chat-placeholder";
import { ColorsPanel } from "./colors/colors-panel";
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
const CustomizeToolsDialog = dynamic(() => import("./customize-tools-dialog"), {
  ssr: false,
});
const ModifySelectionDialog = dynamic(
  () => import("./modify-selection-dialog"),
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
  const [modifying, setModifying] = useState<ModifyKind | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [inserted, setInserted] = useState(0);
  const tutorial = findTutorial(guide);
  const [exportSettings, setExportSettings] =
    useState<ExportSettings>(DEFAULT_EXPORT);
  const [tool, setTool] = useState<ToolId>("pen");
  const [layout, setLayout] = useEditorLayout(userId);
  const panelDrag = usePanelDrag((id, target) =>
    setLayout((l) => movePanel(l, id, target)),
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
  const [stamp, setStamp] = useState<Stamp | null>(null);
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

  const sprite = useSprite(image, file.markDirty, kept?.sprite);
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
        label: "Transform",
        submenu: [
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
        label: "Invert",
        shortcut: `${mod}Shift+I`,
        onSelect: commands.invertSelection,
      },
      {
        label: "Reselect",
        shortcut: `${mod}Shift+D`,
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
        label: check(view.onion > 0, "Onion skin"),
        shortcut: "F3",
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
              label: check(view.gridSize === 0, "No grid"),
              onSelect: () => setView((v) => ({ ...v, gridSize: 0 })),
            },
            ...GRID_SIZES.map((n) => ({
              label: check(view.gridSize === n, `${n} × ${n}`),
              onSelect: () => setView((v) => ({ ...v, gridSize: n })),
            })),
          ],
        ],
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

  const panels: Record<PanelId, PanelContent> = {
    tools: {
      fit: true,
      body: (
        <ToolBar
          tool={tool}
          onSelect={setTool}
          hiddenTools={layout.hiddenTools}
          groupTools={layout.groupTools}
        />
      ),
    },
    colors: { body: <ColorsPanel pen={pen} onChange={setPen} /> },
    palette: {
      body: (
        <PalettePanel
          pen={pen}
          onChange={setPen}
          palette={sprite.palette}
          colorMode={sprite.colorMode}
          onPaletteChange={(next, change) => {
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
                secondary:
                  p.secondary === edited.from ? edited.to : p.secondary,
              }));
          }}
          frameColors={() => colorsOf(sprite.composite(["reference"]))}
          fileName={file.name}
        />
      ),
    },
    timeline: { body: <Timeline sprite={sprite} playback={playback} /> },
    assistant: {
      body: (
        <EditorChat
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
      <EditorHeader
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
        onImportSheet={() => sheetInput.current?.click()}
        menus={[
          { label: "Edit", sections: editMenu },
          { label: "Select", sections: selectMenu },
          { label: "Tile", sections: tileMenu },
          { label: "View", sections: viewMenu },
        ]}
        afterMenus={[{ label: "Window", sections: windowMenu }]}
      />
      <div className="flex min-h-12 shrink-0 items-center border-b bg-background px-4 py-2">
        <ToolOptions
          tool={toolById(tool)}
          pen={pen}
          onChange={setPen}
          selection={selection}
          stamp={stamp}
          onClearStamp={() => setStamp(null)}
          onUseAsBrush={useAsBrush}
          slice={slice}
          onSliceChange={changeSlice}
          onSliceDelete={deleteSlice}
        />
      </div>
      <div className="flex min-h-0 flex-1">
        <Dock side="left" {...dockProps} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TileTabs
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
            <Dock side="innerLeft" {...dockProps} />
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
                <PixelCanvas
                  ref={canvas}
                  tool={toolById(tool)}
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
            <Dock side="innerRight" {...dockProps} />
          </div>
          <Dock side="bottom" {...dockProps} />
        </div>
        <Dock side="right" {...dockProps} />
      </div>
      <DragOverlay drag={panelDrag} />
      {customizing && (
        <CustomizeToolsDialog
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
          pixelRatio={sprite.pixelRatio}
          settings={exportSettings}
          onChange={setExportSettings}
          onClose={() => setExporting(false)}
        />
      )}
    </div>
  );
}
