import "server-only";
import { execFile } from "node:child_process";
import { rmSync, unlinkSync } from "node:fs";
import { createHash, timingSafeEqual } from "node:crypto";
import { join } from "node:path";
import { promisify } from "node:util";
import { NextResponse, type NextRequest } from "next/server";
import { assetFileUrl } from "@/features/assets/assets";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasErrors, issuesOf } from "../../../scripts/assets/lib/checks.ts";
import { framesOf } from "../../../scripts/assets/lib/pigxel.ts";
import { ASSETS_DIR } from "../../../scripts/assets/lib/paths.ts";
import { encodePng } from "../../../scripts/assets/lib/png.ts";
import { removeAsset } from "../../../scripts/assets/lib/remote.ts";
import { stripOf } from "../../../scripts/assets/lib/render.ts";
import {
  readReviews,
  REVIEW_FILE,
  reviewState,
  writeReviews,
  type ReviewEntry,
} from "../../../scripts/assets/lib/review.ts";
import {
  isPremium,
  loadPacks,
  PACKS_DIR,
  updatePack,
  type AssetSource,
  type PackSource,
} from "../../../scripts/assets/lib/source.ts";
import {
  MAX_BLOCK_NAME,
  MAX_NOTE,
  REVIEW_COOKIE,
  REVIEW_STATUSES,
} from "./constants";
import type {
  ProductionAsset,
  ReviewSnapshot,
  ReviewStatus,
  ReviewTarget,
  ReviewTile,
} from "./types";

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PUBLISH_TIMEOUT = 5 * 60 * 1000;

export class ReviewError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const reviewKey = () => process.env.ASSETS_REVIEW_KEY ?? "";

export const isReviewOpen = () =>
  process.env.NODE_ENV === "development" && reviewKey().length > 0;

const digest = (value: string) => createHash("sha256").update(value).digest();

export function isReviewKey(value: string | undefined) {
  return (
    !!value &&
    isReviewOpen() &&
    timingSafeEqual(digest(value), digest(reviewKey()))
  );
}

export function guard(request: NextRequest) {
  if (!isReviewOpen()) return new NextResponse(null, { status: 404 });
  if (!isReviewKey(request.cookies.get(REVIEW_COOKIE)?.value))
    return NextResponse.json(
      { error: "Enter the review key." },
      { status: 401 },
    );
  return null;
}

export function failed(error: unknown) {
  if (error instanceof ReviewError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error(error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : String(error) },
    { status: 500 },
  );
}

async function production() {
  const supabase = createAdminClient();
  const [assets, blocks] = await Promise.all([
    supabase.from("assets").select("id").returns<{ id: string }[]>(),
    supabase
      .from("asset_blocks")
      .select("id, name")
      .order("sort")
      .order("name")
      .returns<ReviewTarget[]>(),
  ]);
  const error = assets.error ?? blocks.error;
  if (error) throw new Error(`Couldn’t read production: ${error.message}`);
  return {
    ids: new Set(assets.data!.map((row) => row.id)),
    blocks: blocks.data!,
  };
}

function tileOf(
  pack: PackSource,
  source: AssetSource,
  entry: ReviewEntry | undefined,
): ReviewTile {
  const def = source.def;
  const frames = def ? framesOf(def) : null;
  const issues = issuesOf(source, pack);
  return {
    key: source.key,
    pack: pack.id,
    id: source.id,
    name: def?.name ?? source.id,
    kind: def?.kind ?? null,
    notes: def?.notes ?? "",
    hash: source.hash,
    w: frames?.w ?? 0,
    h: frames?.h ?? 0,
    frames: frames?.frames.map((f) => f.ms) ?? [],
    clips: frames?.tags ?? [],
    issues,
    blocked: hasErrors([...pack.issues, ...issues]),
    state: reviewState(source, entry),
    note: entry?.note ?? "",
    premium: isPremium(pack, source.id),
  };
}

export async function reviewSnapshot(): Promise<ReviewSnapshot> {
  let live = new Set<string>();
  let targets: ReviewTarget[] = [];
  let productionError: string | null = null;
  try {
    ({ ids: live, blocks: targets } = await production());
  } catch (e) {
    productionError = e instanceof Error ? e.message : String(e);
  }
  const reviews = readReviews(REVIEW_FILE);
  const blocks = loadPacks(PACKS_DIR).map((pack) => ({
    id: pack.id,
    name: pack.name,
    target: pack.block,
    premium: pack.tier === "paid",
    issues: pack.issues,
    tiles: pack.assets
      .filter((source) => !live.has(source.id))
      .map((source) => tileOf(pack, source, reviews[source.key])),
  }));
  return { blocks, targets, productionError };
}

function findPack(id: unknown) {
  const pack =
    typeof id === "string" && ID.test(id)
      ? loadPacks(PACKS_DIR).find((p) => p.id === id)
      : undefined;
  if (!pack) throw new ReviewError("No such block.", 404);
  return pack;
}

function findTile(key: unknown) {
  const [packId, id] = typeof key === "string" ? key.split("/") : [];
  const pack = findPack(packId);
  const source = pack.assets.find((a) => a.id === id);
  if (!source) throw new ReviewError("No such tile.", 404);
  return { pack, source };
}

export function setReview(key: unknown, status: unknown, note: unknown) {
  const { pack, source } = findTile(key);
  if (!REVIEW_STATUSES.includes(status as ReviewStatus))
    throw new ReviewError("Unknown status.");
  const text = String(note ?? "")
    .trim()
    .slice(0, MAX_NOTE);
  if (
    status === "approved" &&
    hasErrors([...pack.issues, ...issuesOf(source, pack)])
  )
    throw new ReviewError("Fix its errors before approving it.");
  if (status === "fix" && !text)
    throw new ReviewError("Write what to fix in the comment.");
  const reviews = readReviews(REVIEW_FILE);
  reviews[source.key] = {
    status: status as ReviewStatus,
    note: text,
    hash: source.hash,
    at: new Date().toISOString(),
  };
  writeReviews(reviews, REVIEW_FILE);
}

function deleteLocal(pack: PackSource, source: AssetSource) {
  unlinkSync(source.file);
  const reviews = readReviews(REVIEW_FILE);
  delete reviews[source.key];
  writeReviews(reviews, REVIEW_FILE);
  if (pack.assets.length === 1) {
    rmSync(join(PACKS_DIR, pack.id), { recursive: true });
    return;
  }
  updatePack(
    pack.id,
    (json) => {
      json.assets = pack.assets
        .map((a) => a.id)
        .filter((id) => id !== source.id);
      json.premium = pack.premium.filter((id) => id !== source.id);
    },
    PACKS_DIR,
  );
}

export function rejectTile(key: unknown) {
  const { pack, source } = findTile(key);
  deleteLocal(pack, source);
}

export async function updateBlock(
  id: unknown,
  {
    name,
    premium,
    target,
  }: { name?: unknown; premium?: unknown; target?: unknown },
) {
  const pack = findPack(id);
  if (target !== undefined && target !== null) {
    const { blocks } = await production();
    if (
      typeof target !== "string" ||
      target === pack.id ||
      !blocks.some((block) => block.id === target)
    )
      throw new ReviewError("No such block on the Assets page.");
  }
  const title = typeof name === "string" ? name.trim() : undefined;
  if (name !== undefined && (!title || title.length > MAX_BLOCK_NAME))
    throw new ReviewError(`The name must be 1–${MAX_BLOCK_NAME} characters.`);
  if (premium !== undefined && typeof premium !== "boolean")
    throw new ReviewError("premium must be true or false.");
  updatePack(
    pack.id,
    (json) => {
      if (title) json.name = title;
      if (target === null) delete json.block;
      else if (typeof target === "string") json.block = target;
      if (typeof premium === "boolean") json.tier = premium ? "paid" : "free";
    },
    PACKS_DIR,
  );
}

export function setTilePremium(key: unknown, premium: unknown) {
  const { pack, source } = findTile(key);
  if (typeof premium !== "boolean")
    throw new ReviewError("premium must be true or false.");
  if (pack.tier === "paid")
    throw new ReviewError("The whole block is premium.");
  updatePack(
    pack.id,
    (json) => {
      const list = pack.premium.filter((id) => id !== source.id);
      json.premium = premium ? [...list, source.id] : list;
    },
    PACKS_DIR,
  );
}

export function stripPng(packId: string, id: string) {
  const def = findPack(packId).assets.find((a) => a.id === id)?.def;
  if (!def) throw new ReviewError("No such tile.", 404);
  const sheet = stripOf(def);
  return encodePng(sheet.w, sheet.h, sheet.data);
}

type ProductionRow = {
  id: string;
  name: string;
  category: string;
  kind: "sprite" | "tile";
  width: number;
  height: number;
  frame_count: number;
  frame_ms: number;
  premium: boolean;
  sheet_path: string;
};

export async function productionAssets(): Promise<ProductionAsset[]> {
  const { data, error } = await createAdminClient()
    .from("assets")
    .select(
      "id, name, category, kind, width, height, frame_count, frame_ms, premium, sheet_path",
    )
    .order("category")
    .order("sort")
    .order("name")
    .returns<ProductionRow[]>();
  if (error) throw new Error(`Couldn’t read production: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    kind: row.kind,
    width: row.width,
    height: row.height,
    frames: row.frame_count,
    frameMs: row.frame_ms,
    premium: row.premium,
    sheetUrl: assetFileUrl(row.sheet_path),
  }));
}

export async function removeFromProduction(id: string) {
  if (!ID.test(id)) throw new ReviewError("No such asset.", 404);
  if (!(await removeAsset(createAdminClient(), id)))
    throw new ReviewError("No such asset.", 404);
  for (const pack of loadPacks(PACKS_DIR)) {
    const source = pack.assets.find((a) => a.id === id);
    if (source) deleteLocal(pack, source);
  }
}

const run = promisify(execFile);
let publishing = false;

async function script(name: string) {
  try {
    const { stdout, stderr } = await run(
      process.execPath,
      [join(ASSETS_DIR, name)],
      { cwd: process.cwd(), env: process.env, timeout: PUBLISH_TIMEOUT },
    );
    return stdout + stderr;
  } catch (e) {
    const out = e as { stdout?: string; stderr?: string; message?: string };
    throw new ReviewError(
      `${name} failed:\n${out.stdout ?? ""}${out.stderr || out.message || ""}`,
      500,
    );
  }
}

export async function publishApproved() {
  if (publishing) throw new ReviewError("Already publishing.", 409);
  publishing = true;
  try {
    const built = await script("build.ts");
    const imported = await script("import.ts");
    return `${built}\n${imported}`.trim();
  } finally {
    publishing = false;
  }
}
