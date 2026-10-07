import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  WebMOutputFormat,
} from "mediabunny";
import mascot from "../../../../public/art/pigxel-mascot-sitting.png";
import { safeFileBase } from "@/lib/pigxel-file/format";
import {
  TIMELAPSE_COLORS,
  TIMELAPSE_FPS,
  type ExportSettings,
} from "./constants";
import type { ExportFile, ExportSource } from "./export";
import {
  artPlacement,
  outroTime,
  paint,
  paintOrder,
  strokesBy,
  timelapseSize,
  timelapseTiming,
} from "./timelapse";

const ART_OUT = { at: 0, for: 0.45 };
const DARKEN = { at: 0.15, for: 0.45 };
const LOGO_IN = { at: 0.45, for: 0.6 };
const WORD_IN = { at: 0.85, for: 0.5 };

const progressOf = (t: number, phase: { at: number; for: number }) =>
  Math.min(1, Math.max(0, (t - phase.at) / phase.for));

const easeOut = (t: number) => 1 - (1 - t) ** 3;

const easeOutBack = (t: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

async function loadMascot() {
  const response = await fetch(mascot.src);
  return createImageBitmap(await response.blob());
}

async function wordmarkFont(px: number) {
  const family =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-fredoka")
      .trim() || "sans-serif";
  const font = `600 ${px}px ${family}`;
  try {
    await document.fonts.load(font, "Pigxel");
  } catch {}
  return font;
}

async function videoFormat(width: number, height: number) {
  const codec =
    typeof VideoEncoder === "undefined"
      ? null
      : await getFirstEncodableVideoCodec(["avc", "vp9", "av1", "vp8"], {
          width,
          height,
          quality: QUALITY_HIGH,
        });
  if (!codec)
    throw new Error(
      "This browser can’t record video. Try the latest Chrome, Edge or Safari.",
    );
  return {
    codec,
    format:
      codec === "avc"
        ? new Mp4OutputFormat({ fastStart: "in-memory" })
        : new WebMOutputFormat(),
  };
}

export async function renderTimelapse(
  source: ExportSource,
  settings: ExportSettings,
  onProgress: (done: number) => void,
  signal: AbortSignal,
): Promise<ExportFile> {
  const video = timelapseSize(settings.timelapseShape);
  const tile = source.size;
  const stages =
    settings.timelapseStyle === "layers" && source.stages
      ? source.stages(source.frameId)
      : [source.picture(source.frameId)];
  const strokes = paintOrder(stages, tile, settings.timelapseStyle);
  const timing = timelapseTiming(settings.timelapseLength);
  const art = artPlacement(video, tile);

  const canvas = document.createElement("canvas");
  canvas.width = video.w;
  canvas.height = video.h;
  const ctx = canvas.getContext("2d");
  const artCanvas = new OffscreenCanvas(tile.w, tile.h);
  const artCtx = artCanvas.getContext("2d");
  if (!ctx || !artCtx) throw new Error("This browser can’t draw the picture.");
  const pixels = new Uint8ClampedArray(tile.w * tile.h * 4);

  const logo = await loadMascot();
  const logoScale = Math.max(1, Math.round((video.w * 0.45) / logo.width));
  const logoSize = { w: logo.width * logoScale, h: logo.height * logoScale };
  const wordPx = Math.round(video.w * 0.12);
  const font = await wordmarkFont(wordPx);
  const gap = Math.round(wordPx * 0.25);
  const groupTop = Math.round((video.h - logoSize.h - gap - wordPx) / 2);

  const drawArt = (t: number) => {
    const out = easeOut(progressOf(t, ART_OUT));
    if (out >= 1) return;
    const shrink = 1 - 0.08 * out;
    const onCard = (draw: () => void) => {
      ctx.save();
      ctx.globalAlpha = 1 - out;
      ctx.translate(video.w / 2, video.h / 2);
      ctx.scale(shrink, shrink);
      ctx.translate(-video.w / 2, -video.h / 2);
      draw();
      ctx.restore();
    };
    onCard(() => {
      ctx.shadowColor = TIMELAPSE_COLORS.shadow;
      ctx.shadowBlur = Math.round(video.w * 0.04);
      ctx.shadowOffsetY = Math.round(video.w * 0.01);
      ctx.fillStyle = TIMELAPSE_COLORS.card;
      ctx.fillRect(art.x, art.y, art.w, art.h);
    });
    onCard(() => {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(artCanvas, art.x, art.y, art.w, art.h);
    });
  };

  const drawOutro = (t: number) => {
    const dark = easeOut(progressOf(t, DARKEN));
    if (!dark) return;
    ctx.save();
    ctx.globalAlpha = dark;
    ctx.fillStyle = TIMELAPSE_COLORS.outro;
    ctx.fillRect(0, 0, video.w, video.h);
    ctx.restore();

    const pop = progressOf(t, LOGO_IN);
    if (pop > 0) {
      const s = easeOutBack(pop);
      const w = logoSize.w * s;
      const h = logoSize.h * s;
      ctx.save();
      ctx.globalAlpha = Math.min(1, pop * 3);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        logo,
        (video.w - w) / 2,
        groupTop + (logoSize.h - h) / 2,
        w,
        h,
      );
      ctx.restore();
    }

    const word = easeOut(progressOf(t, WORD_IN));
    if (word > 0) {
      ctx.save();
      ctx.globalAlpha = word;
      ctx.fillStyle = TIMELAPSE_COLORS.wordmark;
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(
        "Pigxel",
        video.w / 2,
        groupTop + logoSize.h + gap + (1 - word) * wordPx * 0.5,
      );
      ctx.restore();
    }
  };

  const { codec, format } = await videoFormat(video.w, video.h);
  const output = new Output({ format, target: new BufferTarget() });
  const track = new CanvasSource(canvas, { codec, quality: QUALITY_HIGH });
  output.addVideoTrack(track, { frameRate: TIMELAPSE_FPS });

  try {
    await output.start();
    let painted = 0;
    for (let frame = 0; frame < timing.total; frame++) {
      signal.throwIfAborted();
      const next = strokesBy(frame, timing, strokes.at.length);
      if (next > painted) {
        paint(pixels, strokes, painted, next);
        artCtx.putImageData(new ImageData(pixels, tile.w, tile.h), 0, 0);
        painted = next;
      }
      const t = outroTime(frame, timing);
      ctx.fillStyle = TIMELAPSE_COLORS.backdrop;
      ctx.fillRect(0, 0, video.w, video.h);
      drawArt(t);
      drawOutro(t);
      await track.add(frame / TIMELAPSE_FPS, 1 / TIMELAPSE_FPS);
      onProgress((frame + 1) / timing.total);
    }
    await output.finalize();
  } catch (error) {
    if (output.state !== "finalized") await output.cancel().catch(() => {});
    throw error;
  } finally {
    logo.close();
  }

  return {
    name: `${safeFileBase(source.name)}-timelapse${format.fileExtension}`,
    mime: format.mimeType,
    data: new Uint8Array(output.target.buffer!),
  };
}
