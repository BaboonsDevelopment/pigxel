/**
 * A local page to review drawn assets: every frame and clip animated, tiles
 * repeated, the checks' findings, and Approve / Reject with a note. Decisions
 * go to `review.json`; only approved assets are built and uploaded. The page
 * follows edits to the files, so redraws show up without reloading.
 *
 *   node scripts/assets/review.ts [--port 4870]
 */
import { createServer, type ServerResponse } from "node:http";
import { parseArgs } from "node:util";
import { hasErrors, issuesOf } from "./lib/checks.ts";
import { framesOf } from "./lib/pigxel.ts";
import { encodePng } from "./lib/png.ts";
import { stripOf } from "./lib/render.ts";
import {
  readReviews,
  reviewState,
  writeReviews,
  type ReviewStatus,
} from "./lib/review.ts";
import { loadPacks } from "./lib/source.ts";

const { values } = parseArgs({
  options: { port: { type: "string", default: "4870" } },
});

const STATUSES: ReviewStatus[] = ["approved", "rejected", "pending"];
const MAX_NOTE = 2000;

function state() {
  const reviews = readReviews();
  const packs = loadPacks();
  const assets = packs.flatMap((pack) =>
    pack.assets.map((source) => {
      const issues = [...pack.issues, ...issuesOf(source, pack)];
      const def = source.def;
      const frames = def ? framesOf(def) : null;
      const entry = reviews[source.key];
      return {
        key: source.key,
        pack: pack.id,
        id: source.id,
        name: def?.name ?? source.id,
        category: def?.category ?? null,
        notes: def?.notes ?? "",
        hash: source.hash,
        w: frames?.w ?? 0,
        h: frames?.h ?? 0,
        frames: frames?.frames.map((f) => f.ms) ?? [],
        clips: frames?.tags ?? [],
        issues,
        blocked: hasErrors(issues),
        state: reviewState(source, entry),
        note: entry?.note ?? "",
      };
    }),
  );
  const version = assets
    .map((a) => `${a.key}:${a.hash}:${a.state}:${a.note.length}`)
    .join("|");
  return {
    packs: packs.map((p) => ({ id: p.id, name: p.name })),
    assets,
    version,
  };
}

function send(
  res: ServerResponse,
  status: number,
  type: string,
  body: string | Uint8Array,
) {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

const json = (res: ServerResponse, status: number, body: unknown) =>
  send(res, status, "application/json", JSON.stringify(body));

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/")
      return send(res, 200, "text/html; charset=utf-8", PAGE);
    if (req.method === "GET" && url.pathname === "/api/state")
      return json(res, 200, state());

    const strip = url.pathname.match(
      /^\/strip\/([a-z0-9-]+)\/([a-z0-9-]+)\.png$/,
    );
    if (req.method === "GET" && strip) {
      const pack = loadPacks().find((p) => p.id === strip[1]);
      const def = pack?.assets.find((a) => a.id === strip[2])?.def;
      if (!def) return send(res, 404, "text/plain", "Not found");
      const sheet = stripOf(def);
      return send(
        res,
        200,
        "image/png",
        encodePng(sheet.w, sheet.h, sheet.data),
      );
    }

    if (req.method === "POST" && url.pathname === "/api/review") {
      let body = "";
      req.on("data", (chunk: Buffer) => (body += chunk.toString()));
      req.on("end", () => {
        try {
          const { key, status, note } = JSON.parse(body) as {
            key: string;
            status: ReviewStatus;
            note?: string;
          };
          const asset = state().assets.find((a) => a.key === key);
          if (!asset) return json(res, 404, { error: "No such asset." });
          if (!STATUSES.includes(status))
            return json(res, 400, { error: "Unknown status." });
          if (status === "approved" && asset.blocked)
            return json(res, 400, {
              error: "Fix its errors before approving it.",
            });
          const reviews = readReviews();
          reviews[key] = {
            status,
            note: String(note ?? "").slice(0, MAX_NOTE),
            hash: asset.hash,
            at: new Date().toISOString(),
          };
          writeReviews(reviews);
          json(res, 200, { ok: true });
        } catch (e) {
          json(res, 400, { error: e instanceof Error ? e.message : String(e) });
        }
      });
      return;
    }
    send(res, 404, "text/plain", "Not found");
  } catch (e) {
    send(
      res,
      500,
      "text/plain",
      e instanceof Error ? (e.stack ?? e.message) : String(e),
    );
  }
});

server.listen(Number(values.port), "127.0.0.1", () =>
  console.log(`Reviewing assets at http://localhost:${values.port}`),
);

const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Asset review</title>
<style>
  :root { color-scheme: dark; --bg:#17171c; --card:#22222a; --line:#34343f; --text:#ececf1; --muted:#9a9aa8;
    --ok:#4ade80; --bad:#f87171; --warn:#fbbf24; --info:#60a5fa; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui, sans-serif; }
  header { position:sticky; top:0; z-index:2; background:var(--bg); border-bottom:1px solid var(--line);
    padding:12px 16px; display:flex; flex-wrap:wrap; gap:8px 16px; align-items:center; }
  h1 { font-size:16px; margin:0 8px 0 0; }
  .group { display:flex; gap:4px; flex-wrap:wrap; }
  button, select { font:inherit; color:var(--text); background:var(--card); border:1px solid var(--line);
    border-radius:8px; padding:5px 10px; cursor:pointer; }
  button[aria-pressed=true] { border-color:var(--info); background:#1e2a3d; }
  button:disabled { opacity:.4; cursor:not-allowed; }
  main { padding:16px; display:grid; gap:16px; grid-template-columns:repeat(auto-fill, minmax(min(100%, 420px), 1fr)); }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px; }
  .card.approved { border-color:#2f5d3e; } .card.rejected { border-color:#6b2f2f; }
  .top { display:flex; justify-content:space-between; gap:8px; align-items:baseline; }
  .name { font-weight:600; font-size:15px; } .meta { color:var(--muted); font-size:12px; }
  .badge { font-size:12px; padding:2px 8px; border-radius:999px; border:1px solid currentColor; white-space:nowrap; }
  .badge.approved { color:var(--ok); } .badge.rejected { color:var(--bad); }
  .badge.pending, .badge.changed { color:var(--warn); }
  .stage { display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end; }
  .anim { display:flex; flex-direction:column; gap:4px; align-items:flex-start; }
  .anim span { font-size:11px; color:var(--muted); }
  canvas { image-rendering:pixelated; border-radius:6px; display:block; }
  .bg-checker canvas { background:repeating-conic-gradient(#d8d8de 0 25%, #f2f2f5 0 50%) 0 0/16px 16px; }
  .bg-light canvas { background:#f4f1ea; } .bg-dark canvas { background:#1f2430; } .bg-grass canvas { background:#3e8948; }
  .frames { overflow-x:auto; }
  ul.issues { margin:0; padding-left:18px; font-size:12.5px; }
  li.error { color:var(--bad); } li.warning { color:var(--warn); }
  .notes { color:var(--muted); font-size:12.5px; font-style:italic; }
  textarea { width:100%; min-height:52px; resize:vertical; font:inherit; color:var(--text); background:var(--bg);
    border:1px solid var(--line); border-radius:8px; padding:6px 8px; }
  .actions { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
  .approve { border-color:#2f5d3e; } .reject { border-color:#6b2f2f; }
  .err { color:var(--bad); font-size:12px; }
  .empty { color:var(--muted); padding:40px; text-align:center; grid-column:1/-1; }
</style>
</head>
<body class="bg-checker">
<header>
  <h1>Asset review</h1>
  <div class="group" id="filters"></div>
  <select id="pack" aria-label="Pack"></select>
  <div class="group" aria-label="Background">
    <button data-bg="checker" aria-pressed="true">Checker</button>
    <button data-bg="light">Light</button>
    <button data-bg="dark">Dark</button>
    <button data-bg="grass">Grass</button>
  </div>
  <label class="meta">Zoom <select id="zoom"><option>4</option><option selected>6</option><option>8</option><option>12</option></select></label>
</header>
<main id="list"></main>
<script>
const FILTERS = [["todo","To review"],["approved","Approved"],["rejected","Rejected"],["blocked","Errors"],["all","All"]];
let data = null, filter = "todo", pack = "", zoom = 6, timers = [];
const drafts = new Map();
const $ = (s) => document.querySelector(s);
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids.filter(k => k != null)); return n; };

function matches(a) {
  if (pack && a.pack !== pack) return false;
  if (filter === "todo") return !a.blocked && (a.state === "pending" || a.state === "changed");
  if (filter === "blocked") return a.blocked;
  if (filter === "all") return true;
  return a.state === filter;
}

function renderFilters() {
  const box = $("#filters"); box.replaceChildren();
  for (const [value, label] of FILTERS) {
    const n = data.assets.filter(a => matchesFor(value, a)).length;
    const b = el("button", { textContent: label + " " + n });
    b.setAttribute("aria-pressed", String(filter === value));
    b.onclick = () => { filter = value; render(); };
    box.append(b);
  }
}
function matchesFor(value, a) { const saved = filter; filter = value; const ok = matches(a); filter = saved; return ok; }

function drawFrame(ctx, img, i, w, h, k) {
  ctx.clearRect(0, 0, w * k, h * k);
  ctx.drawImage(img, i * w, 0, w, h, 0, 0, w * k, h * k);
}

function card(a, img) {
  const c = el("article", { className: "card " + a.state });
  c.append(el("div", { className: "top" },
    el("div", {}, el("div", { className: "name", textContent: a.name }),
      el("div", { className: "meta", textContent: a.key + " · " + (a.category ?? "?") + " · " + a.w + "×" + a.h + " · " + a.frames.length + " frame" + (a.frames.length === 1 ? "" : "s") })),
    el("span", { className: "badge " + a.state, textContent: a.state === "changed" ? "changed since review" : a.state })));

  if (img) {
    const stage = el("div", { className: "stage" });
    const k = zoom;
    for (const clip of a.clips) {
      const canvas = el("canvas", { width: a.w * k, height: a.h * k });
      const ctx = canvas.getContext("2d"); ctx.imageSmoothingEnabled = false;
      const order = [];
      for (let i = clip.from; i <= clip.to; i++) order.push(i);
      if (clip.direction === "pingpong") for (let i = clip.to - 1; i > clip.from; i--) order.push(i);
      let step = 0;
      drawFrame(ctx, img, order[0], a.w, a.h, k);
      if (order.length > 1) {
        const tick = () => { step = (step + 1) % order.length; drawFrame(ctx, img, order[step], a.w, a.h, k); timers.push(setTimeout(tick, a.frames[order[step]] || 120)); };
        timers.push(setTimeout(tick, a.frames[order[0]] || 120));
      }
      stage.append(el("div", { className: "anim" }, canvas, el("span", { textContent: clip.name + (order.length > 1 ? " · " + clip.ms + "ms" : "") })));
    }
    if (a.category === "tiles") {
      const n = 3, t = Math.max(2, Math.round(k / 2));
      const canvas = el("canvas", { width: a.w * n * t, height: a.h * n * t });
      const ctx = canvas.getContext("2d"); ctx.imageSmoothingEnabled = false;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) ctx.drawImage(img, 0, 0, a.w, a.h, x * a.w * t, y * a.h * t, a.w * t, a.h * t);
      stage.append(el("div", { className: "anim" }, canvas, el("span", { textContent: "tiled 3×3" })));
    }
    c.append(stage);
    if (a.frames.length > 1) {
      const s = Math.max(2, Math.floor(k / 2));
      const strip = el("canvas", { width: a.w * a.frames.length * s, height: a.h * s });
      const ctx = strip.getContext("2d"); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, strip.width, strip.height);
      c.append(el("div", { className: "frames" }, strip));
    }
  }
  if (a.notes) c.append(el("div", { className: "notes", textContent: a.notes }));
  if (a.issues.length) c.append(el("ul", { className: "issues" }, ...a.issues.map(i => el("li", { className: i.level, textContent: i.rule + ": " + i.message }))));

  const note = el("textarea", { placeholder: "Note — what to fix, or why it's good", value: drafts.get(a.key) ?? a.note });
  note.oninput = () => drafts.set(a.key, note.value);
  const msg = el("span", { className: "err" });
  const decide = async (status) => {
    msg.textContent = "";
    const res = await fetch("/api/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: a.key, status, note: note.value }) });
    if (!res.ok) { msg.textContent = (await res.json()).error; return; }
    drafts.delete(a.key);
    await load(true);
  };
  const approve = el("button", { className: "approve", textContent: "Approve", disabled: a.blocked, onclick: () => decide("approved") });
  const reject = el("button", { className: "reject", textContent: "Reject", onclick: () => decide("rejected") });
  const reset = el("button", { textContent: "Reset", onclick: () => decide("pending") });
  c.append(note, el("div", { className: "actions" }, approve, reject, a.state !== "pending" ? reset : null, msg));
  return c;
}

function render() {
  timers.forEach(clearTimeout); timers = [];
  renderFilters();
  const list = $("#list"); list.replaceChildren();
  const shown = data.assets.filter(matches);
  if (!shown.length) list.append(el("p", { className: "empty", textContent: "Nothing here." }));
  for (const a of shown) {
    if (!a.w) { list.append(card(a, null)); continue; }
    const slot = el("div"); list.append(slot);
    const img = new Image();
    img.onload = () => slot.replaceWith(card(a, img));
    img.onerror = () => slot.replaceWith(card(a, null));
    img.src = "/strip/" + a.pack + "/" + a.id + ".png?v=" + a.hash;
  }
}

async function load(force) {
  const next = await (await fetch("/api/state")).json();
  if (!force && data && next.version === data.version) return;
  const first = !data; data = next;
  if (first) {
    const sel = $("#pack");
    sel.replaceChildren(el("option", { value: "", textContent: "All packs" }), ...data.packs.map(p => el("option", { value: p.id, textContent: p.name })));
    sel.onchange = () => { pack = sel.value; render(); };
  }
  if (document.activeElement?.tagName === "TEXTAREA" && !force) return;
  render();
}

document.querySelectorAll("[data-bg]").forEach(b => b.onclick = () => {
  document.body.className = "bg-" + b.dataset.bg;
  document.querySelectorAll("[data-bg]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
});
$("#zoom").onchange = (e) => { zoom = Number(e.target.value); render(); };
load(true);
setInterval(() => load(false).catch(() => {}), 2000);
</script>
</body>
</html>`;
