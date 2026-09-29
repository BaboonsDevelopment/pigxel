"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { ChatPanel } from "@/components/chat-panel/chat-panel";
import type { CanvasBridge } from "@/components/chat-panel/constants";
import { DEFAULT_SCALE, type Area } from "@/components/pixel-canvas/constants";
import { zoom } from "@/components/pixel-canvas/helpers";
import {
  PixelCanvas,
  type PixelCanvasHandle,
} from "@/components/pixel-canvas/pixel-canvas";
import {
  useLayers,
  type LayersApi,
} from "@/components/pixel-canvas/use-layers";
import { LayersPanel } from "@/components/layers-panel/layers-panel";
import {
  DEFAULT_PEN,
  clampPenSize,
  type PenSettings,
} from "@/components/pixel-canvas/pen";
import { encodeTile } from "@/lib/edit/codec";
import { panelRows } from "@/lib/layers/tree";
import { EDIT_MARGIN } from "@/lib/edit/constants";
import {
  drawOnEmpty,
  findObjects,
  keepMasked,
  liftObjectsInside,
  neighbourMask,
  objectMask,
} from "@/lib/edit/objects";
import { paintedBounds } from "@/lib/edit/raster";
import { applyOps, parseOps } from "@/lib/edit/ops";
import { mergeRedraw } from "@/lib/edit/redraw";
import { GENERATED_PICTURE_STEPS } from "@/lib/image/pipeline";
import { connectDriveUrl, type DriveStatus } from "@/lib/google-drive/status";

import { imageToPixelArt } from "@/lib/image/helpers";
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
  type PigxelDocument,
} from "@/lib/pigxel-file/format";
import { useIsClient } from "@/lib/use-is-client";
import { listCloudTiles } from "@/lib/pigxel-file/cloud";
import { DriveError, listDriveFiles } from "@/lib/pigxel-file/google-drive";
import { FilesDialog } from "./files-dialog";
import { isTyping } from "./helpers";
import { Menu } from "./menu";
import { ToolBar } from "./tool-bar";
import { ToolOptions, sizeKey } from "./tool-options";
import { TOOLS, type ToolId } from "./tools";
import { usePan } from "./use-pan";
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

/** Share of an area that may already be drawn on before a new picture there counts as covering art. */
const MAX_OVERLAP = 0.03;

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
}: EditorProps & { draft: Draft; image: PigxelDocument }) {
  const router = useRouter();
  const [picking, setPicking] = useState<"cloud" | "drive" | null>(null);
  const [tool, setTool] = useState<ToolId>("pen");
  const [pen, setPen] = useState<PenSettings>(() => readPen(userId));
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [highlight, setHighlight] = useState<Area | null>(null);
  const mod = useModifierLabel();
  const canvas = useRef<PixelCanvasHandle>(null);
  const workspace = useRef<HTMLElement>(null);
  const pan = usePan();
  const fileInput = useRef<HTMLInputElement>(null);
  const tile = useRef<LayersApi>(null);
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

  // Every finished change to the layers marks the tile for saving.
  const layers = useLayers(image, file.markDirty);
  useLayoutEffect(() => {
    tile.current = layers;
  });

  // Tool colour and sizes carry over to every tile.
  useEffect(() => writePen(userId, pen), [userId, pen]);

  /** Goes to Google to link the account, then back to this tile with its draft intact. */
  const connectDrive = () =>
    window.location.assign(connectDriveUrl(editorUrl(draft.id)));

  const zoomBy = (direction: 1 | -1) => setScale((s) => zoom(s, -direction));

  const resizePen = (step: 1 | -1) => {
    const key = sizeKey(tool);
    if (key) setPen((p) => ({ ...p, [key]: clampPenSize(p[key] + step) }));
  };

  /** Selects the layer `step` rows down the Layers panel (up when negative). */
  const selectLayer = (step: 1 | -1) => {
    const rows = panelRows(layers.tree);
    const at = rows.findIndex((row) => row.layer.id === layers.activeId);
    const row = rows[at + step];
    if (row) layers.select(row.layer.id);
  };

  const clearLayer = () => {
    if (layers.canPaint) canvas.current?.clear();
  };

  // What a key press does. Keys are matched by position (`e.code`), so
  // shortcuts work in any keyboard layout, e.g. Ukrainian.
  const shortcutFor = (e: KeyboardEvent): (() => void) | null => {
    const { code, shiftKey: shift } = e;
    if (e.ctrlKey || e.metaKey) {
      if (e.altKey) return null;
      if (code === "KeyS" && !shift) return file.save;
      if (code === "KeyO" && !shift) return file.openFromComputer;
      // Text fields keep their own undo.
      if (isTyping(e.target)) return null;
      if (code === "KeyZ") return shift ? layers.redo : layers.undo;
      if (code === "KeyY") return layers.redo;
      if (code === "Equal" || code === "NumpadAdd") return () => zoomBy(1);
      if (code === "Minus" || code === "NumpadSubtract")
        return () => zoomBy(-1);
      if (code === "Digit0" || code === "Numpad0")
        return () => setScale(DEFAULT_SCALE);
      return null;
    }
    if (isTyping(e.target)) return null;
    if (e.altKey) {
      if (code === "ArrowUp") return () => selectLayer(-1);
      if (code === "ArrowDown") return () => selectLayer(1);
      return null;
    }
    if (shift) return code === "KeyN" ? () => layers.add("normal") : null;
    if (code === "Equal" || code === "NumpadAdd") return () => zoomBy(1);
    if (code === "Minus" || code === "NumpadSubtract") return () => zoomBy(-1);
    if (code === "BracketLeft") return () => resizePen(-1);
    if (code === "BracketRight") return () => resizePen(1);
    if (code === "Delete" || code === "Backspace") return clearLayer;
    const picked = TOOLS.find((t) => code === `Key${t.shortcut}`);
    return picked ? () => setTool(picked.id) : null;
  };

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const run = shortcutFor(e);
    if (!run) return;
    e.preventDefault();
    run();
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

  const fullArea = (): Area => ({ x: 0, y: 0, ...layers.size });

  // A picture from the AI, turned into pixel art at the area's size.
  const toArt = async (dataUrl: string, area: Area) => {
    const image = await (await fetch(dataUrl)).blob();
    return imageToPixelArt(image, area.w, area.h, GENERATED_PICTURE_STEPS);
  };

  // Pixels an edit of `area` may not change: neighbours reaching into it and
  // the objects the plan said to keep.
  const protectedMask = (tile: Uint8ClampedArray, area: Area, keep: Area[]) => {
    const { w, h } = fullArea();
    const mask = neighbourMask(tile, w, h, area);
    objectMask(tile, w, h, keep).forEach((k, i) => k && (mask[i] = 1));
    return mask;
  };

  const bridge: CanvasBridge = {
    isEmpty: () => canvas.current?.isEmpty() ?? true,
    fullArea,
    freeArea: () => canvas.current?.freeArea() ?? null,
    canPaint: () => layers.canPaint,
    snapshot: (area, background) =>
      canvas.current?.snapshot(area, background) ?? "",
    snapshotLayer: (area, background) =>
      canvas.current?.snapshotLayer(area, background) ?? "",
    selectArea: async () => (await canvas.current?.selectArea()) ?? null,
    adjustArea: async (area) =>
      (await canvas.current?.adjustArea(area)) ?? null,
    highlight: setHighlight,
    async place(dataUrl, area, replace) {
      const art = await toArt(dataUrl, area);
      if (replace) canvas.current?.clear();
      canvas.current?.draw(art.rgba, area);
    },
    paintedArea(area) {
      const tile = fullArea();
      const pixels = canvas.current?.read(tile) ?? new Uint8ClampedArray();
      return paintedBounds(pixels, tile.w, area, EDIT_MARGIN);
    },
    encode(area) {
      const tile = fullArea();
      const pixels = canvas.current?.read(tile) ?? new Uint8ClampedArray();
      return encodeTile(pixels, tile.w, tile.h, area);
    },
    // Edits change what lies fully inside their area; drawings that only
    // reach into it (a neighbour's edge) are always put back untouched.
    applyEdit(lines, palette, area, keep) {
      if (!canvas.current) return 0;
      const tile = fullArea();
      const before = canvas.current.read(tile);
      const { ops } = parseOps(lines);
      const result = applyOps(before, tile.w, ops, palette, area);
      const mask = protectedMask(before, area, keep);
      canvas.current.write(keepMasked(before, result.pixels, mask), tile);
      return result.applied;
    },
    async applyRedraw(dataUrl, area, keep) {
      const art = await toArt(dataUrl, area);
      if (!canvas.current) return;
      const tile = fullArea();
      const before = canvas.current.read(tile);
      const after = new Uint8ClampedArray(before);
      const merged = mergeRedraw(canvas.current.read(area), art.rgba);
      for (let y = 0; y < area.h; y++) {
        const row = merged.subarray(y * area.w * 4, (y + 1) * area.w * 4);
        after.set(row, ((area.y + y) * tile.w + area.x) * 4);
      }
      const mask = protectedMask(before, area, keep);
      canvas.current.write(keepMasked(before, after, mask), tile);
    },
    objects() {
      const tile = fullArea();
      const pixels = canvas.current?.read(tile) ?? new Uint8ClampedArray();
      return findObjects(pixels, tile.w, tile.h);
    },
    async replaceObject(dataUrl, source, target) {
      const art = await toArt(dataUrl, target);
      if (!canvas.current) return;
      const tile = fullArea();
      const { rest } = liftObjectsInside(
        canvas.current.read(tile),
        tile.w,
        tile.h,
        source,
      );
      // The moved or resized object never covers other drawings.
      canvas.current.write(drawOnEmpty(rest, tile.w, art.rgba, target), tile);
    },
    moveObject(source, target) {
      if (!canvas.current) return;
      const tile = fullArea();
      const { rest, lifted } = liftObjectsInside(
        canvas.current.read(tile),
        tile.w,
        tile.h,
        source,
      );
      const placed = { ...target, w: source.w, h: source.h };
      canvas.current.write(drawOnEmpty(rest, tile.w, lifted, placed), tile);
    },
    overlapsDrawing(area) {
      // Art on any layer counts, not only the one being drawn on.
      const pixels = canvas.current?.readTile(area) ?? new Uint8ClampedArray();
      let drawn = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) drawn++;
      return drawn > area.w * area.h * MAX_OVERLAP;
    },
    copyObject(source, targets) {
      if (!canvas.current) return;
      const tile = fullArea();
      const before = canvas.current.read(tile);
      const { lifted } = liftObjectsInside(before, tile.w, tile.h, source);
      const after = targets.reduce(
        (pixels, t) =>
          drawOnEmpty(pixels, tile.w, lifted, {
            ...t,
            w: source.w,
            h: source.h,
          }),
        before,
      );
      canvas.current.write(after, tile);
    },
    async placeMany(dataUrl, areas) {
      const arts = await Promise.all(areas.map((a) => toArt(dataUrl, a)));
      if (!canvas.current) return;
      const tile = fullArea();
      const after = arts.reduce(
        (pixels, art, i) => drawOnEmpty(pixels, tile.w, art.rgba, areas[i]!),
        canvas.current.read(tile),
      );
      canvas.current.write(after, tile);
    },
  };

  return (
    <div className="grid h-dvh grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto_minmax(0,1fr)]">
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
              layers={layers}
              highlight={highlight}
              onPickColor={(color) => setPen((p) => ({ ...p, color }))}
            />
          </div>
        </main>
        <LayersPanel layers={layers} />
      </div>
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
