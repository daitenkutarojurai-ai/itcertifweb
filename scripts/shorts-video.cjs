/**
 * Vertical shorts (YouTube Shorts, Instagram Reels, Facebook Reels, TikTok) built from site data.
 *
 *   node scripts/shorts-video.cjs                          # today's calendar slot
 *   node scripts/shorts-video.cjs --slot 2026-12-02        # one calendar slot
 *   node scripts/shorts-video.cjs --from 2026-11-30 --count 12
 *   node scripts/shorts-video.cjs --pick quiz:az-900,concept:lacp,top5:pc-brands-2026,incident:gitlab-2017,
 *        duel:ccna-vs-comptia-network-plus,news:pc-prices-2026      # hand-picked topics
 *   options: --out <dir> (default shorts-out) · --stills (key frames, no encoding) · --plan (list only)
 *            --require-voice (fail instead of shipping a music-only video)
 *
 * Six formats, 1080×1920, 30 fps: quiz (a question from data/free with a 5-second timer), concept
 * explainer (sequence / link-bundle / point diagrams), top 5, incident file, cert duel (data/comparisons),
 * tech news. Hand-written topics live in data/shorts/topics.json. English voice-over + synthesized music
 * (scripts/shorts-audio.cjs), burned-in subtitles and an .srt. Each scene lasts as long as its sentence, so
 * picture, voice and subtitles stay in sync. Without a TTS key the video ships with music only.
 *
 * Calendar: Monday, Wednesday, Friday and Sunday from 2026-11-30; formats rotate (CYCLE) and each format
 * walks its own list. topics.json `calendar` pins a topic to a date (news). Publishing:
 * scripts/shorts-publish.cjs (Facebook + Instagram), .github/workflows/shorts-*.yml.
 *
 * Needs `sharp` and ffmpeg (FFMPEG_PATH, else `ffmpeg` on PATH).
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const sharp = require("sharp");
const { SR, tts, music, tick, chime, writeWav } = require("./shorts-audio.cjs");

const ROOT = process.cwd();
const SITE = "https://certquests.com";
const W = 1080;
const H = 1920;
const FPS = 30;
const SANS = "Inter, Segoe UI, DejaVu Sans, Arial, sans-serif";
const MONO = "JetBrains Mono, Consolas, DejaVu Sans Mono, monospace";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const C = {
  blue: "#3B82F6", sky: "#93C5FD", violet: "#A855F7", lilac: "#C4B5FD", gold: "#FBBF24", green: "#22C55E",
  mint: "#86EFAC", red: "#EF4444", rose: "#FCA5A5", ink: "#F1F5F9", muted: "#94A3B8", dim: "#64748B",
  card: "#0D1528", card2: "#111C33", edge: "#334155",
};

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const OUT = path.resolve(ROOT, arg("out") || "shorts-out");

// ─── Data ─────────────────────────────────────────────────────────────────────
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const TOPICS = readJson("data/shorts/topics.json");
const PACKS = new Map();
for (const b of readJson("data/index.json").brands) for (const p of b.packs) PACKS.set(p.id, { ...p, brand: b.name });
const shortOf = (id) => PACKS.get(id)?.short || id;

// Most searched exams first; quiz slots walk this list. Packs under rewrite and banks without a short enough
// question are skipped (Security+ and CCNA while their rewrite_status is "in-progress").
const QUIZ_PACKS = [
  "az-900", "comptia-a-plus", "aws-clf-c02", "comptia-network-plus", "sc-900", "comptia-cysa", "ccnp-encor",
  "ms-900", "splunk-core", "aws-dva-c02", "az-500", "comptia-security-plus", "ccna",
];
// Two-cert comparisons, most useful first; the rest follow alphabetically.
const DUEL_ORDER = [
  "ccna-vs-comptia-network-plus", "cissp-vs-comptia-security-plus", "cka-vs-ckad",
  "comptia-security-plus-vs-comptia-cysa", "az-500-vs-sc-200", "cism-vs-cissp", "az-104-vs-aws-saa-c03",
  "rhcsa-vs-comptia-linux", "gcp-ace-vs-aws-saa-c03", "cka-vs-cks", "terraform-003-vs-az-400",
];

// Comparisons with a retired exam stay out of the rotation (no retirement flag in index.json yet):
// AZ-204 retired 2026-07-31 (site news), SOA-C02 on 2025-09-29 (replaced by SOA-C03).
const DUEL_SKIP = ["az-104-vs-az-204", "aws-soa-c02-vs-aws-saa-c03"];

function duels() {
  const dir = path.join(ROOT, "data", "comparisons");
  const all = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  const ok = all.filter((c) => c.certs?.length === 2 && c.certs.every((x) => PACKS.has(x.id)) && c.verdicts?.length && !DUEL_SKIP.includes(c.slug));
  const rank = (s) => (DUEL_ORDER.includes(s) ? DUEL_ORDER.indexOf(s) : 100);
  return ok.sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug));
}

const firstSentence = (s) => (s.match(/^.+?[.!?](?=\s|$)/) || [s])[0];

function quizQuestions(packId) {
  const pack = PACKS.get(packId);
  if (!pack || !pack.available || !pack.file || pack.rewrite_status === "in-progress") return null;
  const bank = readJson(path.join("data", pack.file));
  const qs = (bank.questions || bank).filter(
    (q) =>
      Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.correct) && q.explanation &&
      q.question.length <= 280 && q.options.every((o) => o.length <= 95) && firstSentence(q.explanation).length <= 260 &&
      !/\b(not|except)\b/i.test(q.question) && !/all of the above|none of the above/i.test(q.options.join(" ")),
  );
  if (qs.length < 4) return null;
  // Shorter half only: a question read aloud in a short should not take 30 seconds.
  const len = (q) => q.question.length + q.options.join("").length;
  const short = [...qs].sort((a, b) => len(a) - len(b) || String(a.id).localeCompare(String(b.id))).slice(0, Math.max(6, Math.ceil(qs.length / 2)));
  return { pack, qs: short.sort((a, b) => String(a.id).localeCompare(String(b.id))) };
}

// ─── Text helpers ─────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fitFont = (s, maxW, max, k = 0.57) => Math.max(14, Math.min(max, Math.floor(maxW / (Math.max(1, String(s).length) * k))));
function wrap(s, maxChars) {
  const lines = [];
  let cur = "";
  for (const w of String(s).split(/\s+/).filter(Boolean)) {
    if (cur && (cur + " " + w).length > maxChars) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}
/** Largest size (≤ max) at which `s` fits in `maxLines` lines of width maxW, lines balanced in length. */
function fitWrap(s, maxW, max, maxLines, k = 0.55) {
  const balanced = (size) => {
    const cap = Math.floor(maxW / (size * k));
    const n = wrap(s, cap).length;
    let c = cap;
    while (c > 8 && wrap(s, c - 1).length === n) c--;
    return wrap(s, c);
  };
  for (let size = max; size >= 18; size -= 2) {
    if (wrap(s, Math.floor(maxW / (size * k))).length <= maxLines) return { size, lines: balanced(size) };
  }
  return { size: 18, lines: balanced(18) };
}

// What the voice reads: no URLs spelled out, no symbols, exam codes letter by letter.
function spoken(s) {
  return String(s)
    .replace(/certquests\.com(\/\S*)?/gi, "CertQuests dot com")
    .replace(/\b([A-Z]{2,4})-([A-Z]?)(\d{2,3})\b/g, (_, l, x, d) =>
      `${l.split("").join(" ")} ${x ? x + " " : ""}${/^0/.test(d) ? d.split("").map((n) => (n === "0" ? "zero" : n)).join(" ") : d}`)
    .replace(/([A-Za-z])\+/g, "$1 Plus")
    .replace(/\be\.g\./gi, "for example")
    .replace(/\bvs\.?\b/gi, "versus")
    .replace(/[→·|]/g, ",")
    .replace(/~\s?/g, "about ")
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Scenes, timing, subtitles ────────────────────────────────────────────────
// A scene = one sentence: `sub` is shown, `say` (or sub) is read. noSub hides the burned subtitle when the
// same text is already big on screen (the .srt keeps it).
const estimate = (s) => Math.max(1.2, spoken(s).length / 15);

function timeline(scenes, dur) {
  const start = [];
  const end = [];
  const voice = [];
  let t = 0;
  scenes.forEach((s, i) => {
    const lead = i === 0 ? 0.3 : 0.15;
    start.push(t);
    voice.push(t + lead);
    t += Math.max(s.min || 0, lead + dur[i] + 0.25);
    end.push(t);
  });
  return { start, end, voice, dur, total: t + 0.6 };
}

function subtitleChunks(scenes, tl) {
  const chunks = [];
  scenes.forEach((s, i) => {
    const words = s.sub.split(/\s+/).filter(Boolean);
    const groups = [];
    let cur = [];
    for (const w of words) {
      if ([...cur, w].join(" ").length > 56 && cur.length) {
        groups.push(cur);
        cur = [];
      }
      cur.push(w);
    }
    if (cur.length) groups.push(cur);
    // No orphan word: a short tail joins the previous chunk.
    if (groups.length > 1 && groups[groups.length - 1].join(" ").length < 18) groups[groups.length - 2].push(...groups.pop());
    const total = groups.reduce((n, g) => n + g.join(" ").length, 0) || 1;
    let t = tl.voice[i];
    for (const g of groups) {
      const d = (g.join(" ").length / total) * tl.dur[i];
      let best = [g.join(" ")];
      if (g.join(" ").length > 30) {
        let bestDiff = Infinity;
        for (let k = 1; k < g.length; k++) {
          const a = g.slice(0, k).join(" ");
          const b = g.slice(k).join(" ");
          if (Math.abs(a.length - b.length) < bestDiff) {
            bestDiff = Math.abs(a.length - b.length);
            best = [a, b];
          }
        }
      }
      chunks.push({ from: t, to: t + d, lines: best, hidden: !!s.noSub });
      t += d;
    }
  });
  return chunks;
}

function subtitleSvg(chunks, t) {
  const c = chunks.find((x) => t >= x.from && t < x.to + 0.12);
  if (!c || c.hidden) return "";
  const size = Math.min(44, ...c.lines.map((l) => fitFont(l, 940, 44, 0.55)));
  const width = Math.min(1000, Math.max(...c.lines.map((l) => l.length)) * size * 0.56 + 64);
  const lineH = size * 1.22;
  const top = 1450;
  const height = c.lines.length * lineH + 30;
  return `<rect x="${(540 - width / 2).toFixed(0)}" y="${top}" width="${width.toFixed(0)}" height="${height.toFixed(0)}" rx="22" fill="#000" fill-opacity="0.66"/>` +
    c.lines.map((l, k) => text(540, Math.round(top + 15 + size + k * lineH - size * 0.18), l, { size, weight: 800, anchor: "middle" })).join("");
}

const srtTime = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const toSrt = (chunks) => chunks.map((c, i) => `${i + 1}\n${srtTime(c.from)} --> ${srtTime(c.to)}\n${c.lines.join("\n")}\n`).join("\n");

// ─── Drawing ──────────────────────────────────────────────────────────────────
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const prog = (t, a, b) => ease((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const f1 = (n) => Number(n).toFixed(1);

const text = (x, y, s, o) =>
  `<text x="${f1(x)}" y="${f1(y)}" font-family="${o.family || SANS}" font-size="${o.size}" font-weight="${o.weight || 700}" fill="${o.fill || "#FFFFFF"}"` +
  `${o.anchor ? ` text-anchor="${o.anchor}"` : ""}${o.opacity !== undefined ? ` fill-opacity="${clamp01(o.opacity).toFixed(3)}"` : ""}` +
  `${o.spacing ? ` letter-spacing="${o.spacing}"` : ""}>${esc(s)}</text>`;
const lines = (x, y, ls, o, lh = 1.25) => ls.map((l, k) => text(x, y + k * o.size * lh, l, o)).join("");
const group = (op, body, tf = "") => (op <= 0.001 ? "" : `<g opacity="${clamp01(op).toFixed(3)}"${tf ? ` transform="${tf}"` : ""}>${body}</g>`);
const card = (x, y, w, h, o = {}) =>
  `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${o.rx || 28}" fill="${o.fill || C.card}" fill-opacity="${o.fillOpacity ?? 0.92}" stroke="${o.stroke || C.edge}" stroke-width="${o.sw || 2}"/>`;
const label = (x, y, s, fill = C.gold, size = 26, anchor) => text(x, y, s.toUpperCase(), { size, weight: 800, fill, spacing: 3, anchor });
const chips = (cx, y, items, color = C.sky) => {
  const ws = items.map((s) => s.length * 15.5 + 44);
  const total = ws.reduce((a, b) => a + b, 0) + (items.length - 1) * 16;
  let x = cx - total / 2;
  return items.map((s, i) => {
    const out = `<rect x="${f1(x)}" y="${y}" width="${f1(ws[i])}" height="50" rx="25" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-width="2"/>` +
      text(x + ws[i] / 2, y + 34, s, { size: 26, weight: 800, fill: color, anchor: "middle" });
    x += ws[i] + 16;
    return out;
  }).join("");
};
// "A+" → "#APlus", "Network+" → "#NetworkPlus": a bare strip turned "A+" into "#A".
const tagOf = (s) => "#" + String(s).replace(/\+/g, "Plus").replace(/[^A-Za-z0-9]/g, "");
const legend = (s, y = 1408, op = 1) => text(540, y, s, { size: 22, weight: 500, anchor: "middle", fill: C.dim, opacity: op });

const DEFS = `<defs>
  <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.blue}"/><stop offset="0.55" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.gold}"/></linearGradient>
  <linearGradient id="cool" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.sky}"/><stop offset="1" stop-color="${C.lilac}"/></linearGradient>
  <linearGradient id="heat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.gold}"/><stop offset="1" stop-color="#F97316"/></linearGradient>
  <linearGradient id="alarm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.red}"/><stop offset="1" stop-color="#F97316"/></linearGradient>
</defs>`;

function chrome(pillText, pillColor) {
  const w = pillText.length * 17 + 60;
  return `<rect x="0" y="${H - 12}" width="${W}" height="12" fill="url(#brand)"/>` +
    text(150, 116, "CertQuests", { size: 36, weight: 800 }) +
    text(150, 150, "certquests.com", { size: 22, weight: 600, fill: C.sky }) +
    `<rect x="60" y="196" width="${w}" height="54" rx="27" fill="${pillColor}" fill-opacity="0.16" stroke="${pillColor}" stroke-width="2"/>` +
    text(60 + w / 2, 232, pillText, { size: 25, weight: 800, fill: pillColor, anchor: "middle", spacing: 2 });
}

function endCard(head, sub, link, op) {
  if (op <= 0) return "";
  const hs = fitWrap(head, 860, 68, 2, 0.56);
  const ss = fitWrap(sub, 860, 40, 3, 0.55);
  const h = 90 + hs.lines.length * hs.size * 1.15 + 24 + ss.lines.length * ss.size * 1.3 + 40 + 100 + 70;
  const top = 980 - h / 2;
  let y = top + 70 + hs.size;
  let out = card(60, top, 960, h, { rx: 40, stroke: "url(#brand)", sw: 4, fillOpacity: 0.96 });
  out += lines(540, y, hs.lines, { size: hs.size, weight: 900, anchor: "middle" }, 1.15);
  y += (hs.lines.length - 1) * hs.size * 1.15 + 24 + ss.size * 1.1;
  out += lines(540, y, ss.lines, { size: ss.size, weight: 600, anchor: "middle", fill: C.muted }, 1.3);
  y += (ss.lines.length - 1) * ss.size * 1.3 + 50;
  out += `<rect x="190" y="${f1(y)}" width="700" height="100" rx="50" fill="url(#brand)"/>`;
  out += text(540, y + 65, link, { size: fitFont(link, 640, 44, 0.56), weight: 900, anchor: "middle" });
  return group(op, out, `translate(0 ${f1((1 - op) * 40)})`);
}

// Background: dark gradient, soft glows, faint grid, logo. Rendered once.
let bgRaw = null;
async function background() {
  if (bgRaw) return bgRaw;
  let grid = "";
  for (let x = 0; x <= W; x += 60) grid += `M${x} 0V${H}`;
  for (let y = 0; y <= H; y += 60) grid += `M0 ${y}H${W}`;
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#05070D"/><stop offset="0.55" stop-color="#0A1022"/><stop offset="1" stop-color="#170F33"/></linearGradient>
    <radialGradient id="a" cx="0.9" cy="0.1" r="0.6"><stop offset="0" stop-color="${C.blue}" stop-opacity="0.32"/><stop offset="1" stop-color="${C.blue}" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="0.05" cy="0.85" r="0.6"><stop offset="0" stop-color="${C.violet}" stop-opacity="0.28"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>
    <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.05"/><stop offset="1" stop-color="#fff" stop-opacity="0.015"/></linearGradient>
  </defs><rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#a)"/><rect width="${W}" height="${H}" fill="url(#b)"/>
  <path d="${grid}" stroke="url(#gm)" stroke-width="1.5" fill="none"/></svg>`;
  const layers = [];
  const logo = path.join(ROOT, "apple-touch-icon.png");
  if (fs.existsSync(logo)) {
    const mask = Buffer.from(`<svg width="72" height="72"><rect width="72" height="72" rx="18" fill="#fff"/></svg>`);
    const icon = await sharp(logo).resize(72, 72).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
    layers.push({ input: icon, left: 60, top: 82 });
  }
  bgRaw = await sharp(Buffer.from(svg)).composite(layers).removeAlpha().raw().toBuffer();
  return bgRaw;
}

async function renderFrame(svgBody) {
  const bg = await background();
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${DEFS}${svgBody}</svg>`;
  return sharp(bg, { raw: { width: W, height: H, channels: 3 } }).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).jpeg({ quality: 88 }).toBuffer();
}

async function encode(file, seconds, frameAt, voiceWav, musicWav, hasVoice) {
  // Music ducks under the voice (sidechain compressor driven by the voice), then both are mixed.
  const filter = hasVoice
    ? "[1:a]asplit=2[v1][v2];[2:a]volume=0.40[m];[m][v1]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[mc];" +
      "[mc][v2]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-15:TP=-1.5:LRA=11,aresample=44100,aformat=channel_layouts=stereo[a]"
    : "[1:a][2:a]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-18:TP=-1.5:LRA=11,aresample=44100,aformat=channel_layouts=stereo[a]";
  const ff = spawn(
    FFMPEG,
    [
      "-y", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
      "-i", voiceWav, "-i", musicWav,
      "-filter_complex", filter, "-map", "0:v", "-map", "[a]",
      "-t", seconds.toFixed(2), "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", file,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const done = new Promise((res, rej) => {
    ff.on("error", rej);
    ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited with code ${code}`))));
  });
  const n = Math.round(seconds * FPS);
  for (let i = 0; i < n; i++) {
    const jpg = await renderFrame(frameAt(i / FPS));
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await done;
}

const CTA_SUB = (packId) => `Practice free ${shortOf(packId)} questions, no sign-up needed.`;

// ─── Captions ─────────────────────────────────────────────────────────────────
const BASE_TAGS = ["#ITcertification", "#learnIT", "#tech"];
function captionBlock(o) {
  const shortLink = o.link.replace("https://", "");
  const tags = [...new Set([...(o.tags || []), ...BASE_TAGS])].join(" ");
  return [
    "=== YouTube Shorts ===",
    `Title: ${o.title.slice(0, 95)}`,
    `Description:\n${o.hook}\n\n${o.body.join("\n")}\n\n${o.link}\n\nMusic: original CertQuests composition.\n${tags} #shorts`,
    "",
    "=== TikTok ===",
    `${o.hook}\n${o.body.slice(0, 7).join("\n")}\nMore on ${shortLink} (link in bio)\n${tags}`,
    "",
    "=== Instagram Reels / Facebook ===",
    `${o.hook}\n\n${o.body.join("\n")}\n\n👉 ${shortLink} (link in bio)\n\n${tags} #reels`,
  ].join("\n");
}

// ─── Format 1: quiz ───────────────────────────────────────────────────────────
function quizVideo(pack, q) {
  const L = "ABCD";
  const sh = pack.short || pack.name;
  const link = `${SITE}/train.html?pack=${pack.id}`;
  const expl = firstSentence(q.explanation);
  const scenes = [
    { sub: `Can you pass this ${sh} question? You've got five seconds.`, min: 3.2 },
    { sub: q.question, noSub: true, min: 2.4 },
    { sub: q.options.map((o, k) => `${L[k]}: ${o}`).join("  "), say: q.options.map((o, k) => `${L[k]}: ${o}.`).join(" "), noSub: true, min: 3 },
    { sub: "Lock in your answer!", min: 5.8 },
    { sub: `The answer is ${L[q.correct]}: ${q.options[q.correct]}`, noSub: true, min: 2.6 },
    { sub: expl, noSub: true, min: 3 },
    { sub: `Got it right? Comment your score. Then practice ${pack.question_count} free ${sh} questions on certquests.com.`, min: 3.4 },
  ];

  // Static layout: question card, then four option cards; the explanation replaces the question.
  const qf = fitWrap(q.question, 880, 46, 7, 0.55);
  const qTop = 300;
  const qH = 96 + qf.lines.length * qf.size * 1.26 + 26;
  const of = q.options.map((o) => fitWrap(o, 740, 40, 2, 0.55));
  const oSize = Math.min(...of.map((x) => x.size));
  const oLines = q.options.map((o) => fitWrap(o, 740, oSize, 2, 0.55).lines);
  const oH = oLines.map((ls) => Math.max(120, 44 + ls.length * oSize * 1.25 + 12));
  // Options fill the space left under the question (gap 20 to 44 px), squeezed if they overflow.
  const oTop = qTop + qH + 34;
  const used = oH.reduce((a, b) => a + b, 0);
  const gap = Math.max(20, Math.min(44, (1420 - oTop - used) / 3));
  const oY = [];
  let y = oTop;
  for (const h of oH) {
    oY.push(y);
    y += h + gap;
  }
  const squeeze = y - gap > 1430 ? (1430 - oTop) / (y - gap - oTop) : 1;
  for (let k = 0; k < 4; k++) oY[k] = oTop + (oY[k] - oTop) * squeeze;
  const ef = fitWrap(expl, 860, 40, 8, 0.55);
  const eH = 100 + ef.lines.length * ef.size * 1.3 + 20;
  const corrTarget = qTop + eH + 34;

  const frame = (t, tl) => {
    const T = tl.start;
    let s = chrome(`QUIZ · ${sh}`, C.gold);
    // Hook: visible from the first frame (thumbnail), pops in, leaves when the question arrives.
    const hookOut = prog(t, T[1] - 0.1, T[1] + 0.35);
    const pop = 0.9 + 0.1 * ease(t / 0.3);
    s += group(1 - hookOut,
      text(540, 640, "CAN YOU PASS", { size: 96, weight: 900, anchor: "middle", fill: C.gold }) +
      text(540, 750, "this question?", { size: 76, weight: 900, anchor: "middle" }) +
      chips(540, 820, [pack.name.length > 34 ? sh : pack.name], C.sky) +
      `<circle cx="540" cy="1080" r="110" fill="none" stroke="url(#brand)" stroke-width="14"/>` +
      text(540, 1112, "5s", { size: 96, weight: 900, anchor: "middle" }),
      `translate(540 860) scale(${pop.toFixed(3)}) translate(-540 -860)`);

    const qIn = prog(t, T[1] - 0.15, T[1] + 0.35);
    const toExpl = prog(t, T[5] - 0.1, T[5] + 0.45);
    const end = prog(t, T[6] - 0.1, T[6] + 0.45);
    // Question card.
    s += group(qIn * (1 - toExpl),
      card(60, qTop, 960, qH, { stroke: "url(#brand)", sw: 3 }) +
      label(100, qTop + 58, pack.name.length > 44 ? sh : pack.name, C.gold, 24) +
      lines(100, qTop + 96 + qf.size * 0.9, qf.lines, { size: qf.size, weight: 800 }, 1.26),
      `translate(0 ${f1((1 - qIn) * 40)})`);

    // Countdown: ring top right + shrinking bar under the question.
    const cd0 = T[3] + 0.25;
    if (t >= T[3] - 0.1 && t < T[4] + 0.3) {
      const el = clamp01((t - cd0) / 5);
      const digit = Math.max(1, 5 - Math.floor(Math.max(0, t - cd0)));
      const showDigit = t < cd0 + 5 ? String(digit) : "0";
      const r = 54;
      const circ = 2 * Math.PI * r;
      const col = el > 0.6 ? C.red : C.gold;
      const op = prog(t, T[3] - 0.1, T[3] + 0.2) * (1 - prog(t, T[4], T[4] + 0.3));
      s += group(op,
        `<circle cx="940" cy="222" r="${r}" fill="${C.card}" stroke="${C.edge}" stroke-width="10"/>` +
        `<circle cx="940" cy="222" r="${r}" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${f1(circ * (1 - el))} ${f1(circ)}" transform="rotate(-90 940 222)"/>` +
        text(940, 244, showDigit, { size: 60, weight: 900, anchor: "middle", fill: col }) +
        `<rect x="60" y="${f1(qTop + qH - 10)}" width="${f1(960 * (1 - el))}" height="10" rx="5" fill="${col}"/>`);
    }

    // Options.
    const reveal = prog(t, T[4] - 0.05, T[4] + 0.35);
    for (let k = 0; k < 4; k++) {
      const inP = prog(t, T[2] - 0.1 + k * 0.22, T[2] + 0.3 + k * 0.22);
      if (inP <= 0) continue;
      const correct = k === q.correct;
      const op = correct ? 1 : lerp(1, 0.28, reveal) * (1 - toExpl);
      const yy = correct ? lerp(oY[k], corrTarget, toExpl) : oY[k];
      const stroke = correct && reveal > 0 ? C.green : C.edge;
      const fill = correct && reveal > 0 ? "#0B2A1A" : C.card2;
      const bubble = correct && reveal > 0 ? C.green : "url(#brand)";
      let body = card(60, yy, 960, oH[k], { stroke, sw: correct && reveal > 0 ? 5 : 2, fill });
      body += `<circle cx="126" cy="${f1(yy + oH[k] / 2)}" r="34" fill="${bubble}"/>`;
      body += correct && reveal > 0.5
        ? `<path d="M110 ${f1(yy + oH[k] / 2)} l11 12 l22 -24" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
        : text(126, yy + oH[k] / 2 + 13, L[k], { size: 36, weight: 900, anchor: "middle" });
      const ty = yy + oH[k] / 2 - ((oLines[k].length - 1) * oSize * 1.25) / 2 + oSize * 0.36;
      body += lines(190, ty, oLines[k], { size: oSize, weight: 700, fill: correct && reveal > 0 ? C.mint : C.ink }, 1.25);
      s += group(inP * op * (1 - end * 0.85), body, `translate(${f1((1 - inP) * 120)} 0)`);
    }

    // Explanation.
    s += group(toExpl * (1 - end * 0.85),
      card(60, qTop, 960, eH, { stroke: C.green, sw: 3 }) +
      label(100, qTop + 60, "Why", C.green, 26) +
      lines(100, qTop + 100 + ef.size * 0.9, ef.lines, { size: ef.size, weight: 700 }, 1.3));
    s += endCard(`Practice ${pack.question_count} free ${sh} questions`, "Comment your score, then train with explanations for every answer.", "certquests.com", end);
    return s;
  };

  const sfx = (tl) => {
    const out = [];
    for (let i = 0; i < 5; i++) out.push({ t: tl.start[3] + 0.25 + i, pcm: tick(i === 4 ? 1500 : 1100) });
    out.push({ t: tl.start[4], pcm: chime() });
    return out;
  };

  return {
    file: `quiz-${pack.id}`,
    format: "quiz",
    title: `Can you pass this ${sh} question?`,
    link,
    scenes,
    frame,
    sfx,
    caption: captionBlock({
      title: `Can you pass this ${sh} question? 🧠 ${tagOf(sh)}`,
      hook: `Can you pass this ${pack.name} question? Comment your answer before the reveal!`,
      body: [q.question, "", ...q.options.map((o, k) => `${L[k]}) ${o}`), "", `Practice ${pack.question_count} free ${sh} questions with explanations.`],
      link,
      tags: [tagOf(sh), `#${pack.brand.replace(/[^A-Za-z0-9]/g, "")}`, "#examprep", "#quiz"],
    }),
  };
}

// ─── Format 2: concept explainer ──────────────────────────────────────────────
function seqDiagram(d, t, T0, endT) {
  const N = d.nodes.length;
  const colW = 960 / N;
  const cx = (i) => 60 + colW * (i + 0.5);
  const top = 500;
  const boxW = Math.min(300, colW - 14);
  const boxH = 86;
  let s = "";
  d.nodes.forEach((n, i) => {
    s += card(cx(i) - boxW / 2, top, boxW, boxH, { rx: 20, fill: C.card2, stroke: C.edge, sw: 2 });
    s += text(cx(i), top + 55, n, { size: fitFont(n, boxW - 24, 34, 0.56), weight: 800, anchor: "middle" });
    s += `<line x1="${f1(cx(i))}" y1="${top + boxH}" x2="${f1(cx(i))}" y2="1385" stroke="${C.edge}" stroke-width="3" stroke-dasharray="10 12"/>`;
  });
  const rows = d.steps.flatMap((st, i) => st.arrows.map((a, j) => ({ ...a, step: i, j })));
  const rowH = Math.min(200, (1385 - (top + boxH + 80)) / rows.length);
  rows.forEach((a, r) => {
    const t0 = T0[a.step] + 0.1 + a.j * 0.8;
    const p = prog(t, t0, t0 + 0.6);
    if (p <= 0) return;
    const y = top + boxH + 80 + r * rowH + rowH * 0.35;
    const x1 = cx(a.from);
    const x2 = cx(a.to);
    const dir = Math.sign(x2 - x1);
    const xe = lerp(x1 + dir * 8, x2 - dir * 8, p);
    const col = a.accent === "gold" ? C.gold : a.accent === "green" ? C.green : C.sky;
    const current = t < (T0[a.step + 1] ?? endT);
    const op = current ? 1 : 0.5;
    let g = `<line x1="${f1(x1)}" y1="${f1(y)}" x2="${f1(xe)}" y2="${f1(y)}" stroke="${col}" stroke-width="7" stroke-linecap="round"/>`;
    g += p > 0.97
      ? `<path d="M${f1(x2 - dir * 8)} ${f1(y)} l${-dir * 26} -15 v30 z" fill="${col}"/>`
      : `<circle cx="${f1(xe)}" cy="${f1(y)}" r="11" fill="#fff"/>`;
    const lsz = fitFont(a.msg, Math.max(Math.abs(x2 - x1) + 160, 360), 34, 0.6);
    const lw = a.msg.length * lsz * 0.6;
    const mid = Math.max(60 + lw / 2, Math.min(1020 - lw / 2, (x1 + x2) / 2));
    g += `<rect x="${f1(mid - lw / 2 - 12)}" y="${f1(y - lsz - 26)}" width="${f1(lw + 24)}" height="${f1(lsz + 16)}" rx="10" fill="#05070D" fill-opacity="0.8"/>`;
    g += text(mid, y - 20, a.msg, { size: lsz, weight: 700, family: MONO, anchor: "middle", fill: col, opacity: prog(t, t0 + 0.15, t0 + 0.5) });
    s += group(op, g);
  });
  return s;
}

function bundleDiagram(d, t, T0) {
  const n = d.links;
  const ax = 60, aw = 250, bx = 770, bw = 250, top = 640, h = 520;
  const ly = (k) => top + 110 + k * ((h - 170) / Math.max(1, n - 1));
  const x1 = ax + aw;
  const x2 = bx;
  let state = -1;
  d.steps.forEach((_, i) => { if (t >= T0[i] - 0.05) state = i; });
  const st = state >= 0 ? d.steps[state].state : "idle";
  const fresh = state >= 0 ? prog(t, T0[state], T0[state] + 0.45) : 0;
  let s = "";
  for (const [x, name] of [[ax, d.nodes[0]], [bx, d.nodes[1]]]) {
    s += card(x, top, aw, h, { rx: 26, fill: C.card2, stroke: "#475569", sw: 3 });
    s += text(x + aw / 2, top + 60, name, { size: 34, weight: 800, anchor: "middle" });
    for (let k = 0; k < 6; k++) s += `<circle cx="${x + 50 + k * 30}" cy="${top + 92}" r="6" fill="${k % 2 ? C.green : C.dim}"/>`;
    for (let k = 0; k < n; k++) {
      const px = x === ax ? x + aw - 34 : x + 10;
      s += `<rect x="${px}" y="${f1(ly(k) - 16)}" width="24" height="32" rx="4" fill="#1E293B" stroke="${C.muted}" stroke-width="2"/>`;
    }
  }
  const flow = (k, speed, dirn = 1, phase = 0) => {
    let g = "";
    for (let m = 0; m < 3; m++) {
      const f = (((t * speed + m / 3 + phase) % 1) + 1) % 1;
      const x = dirn > 0 ? lerp(x1, x2, f) : lerp(x2, x1, f);
      g += `<circle cx="${f1(x)}" cy="${f1(ly(k))}" r="8" fill="#fff" fill-opacity="0.9"/>`;
    }
    return g;
  };
  let chip = "";
  for (let k = 0; k < n; k++) {
    const y = ly(k);
    if (st === "stp" || st === "idle") {
      const on = k === 0;
      s += `<line x1="${x1}" y1="${f1(y)}" x2="${x2}" y2="${f1(y)}" stroke="${on ? C.green : C.red}" stroke-width="7" ${on ? "" : 'stroke-dasharray="16 14"'} stroke-opacity="${on ? 1 : 0.85}"/>`;
      if (on) s += flow(k, 0.6);
      else s += group(fresh, text(540, y - 14, "BLOCKED", { size: 22, weight: 800, anchor: "middle", fill: C.rose, spacing: 2 }));
      chip = "Spanning Tree: 1 of 4 links forwarding";
    } else if (st === "negotiate") {
      s += `<line x1="${x1}" y1="${f1(y)}" x2="${x2}" y2="${f1(y)}" stroke="${C.dim}" stroke-width="7"/>`;
      const f = (((t - T0[state]) * 0.55 + k * 0.2) % 1 + 1) % 1;
      const xr = lerp(x1 + 30, x2 - 30, f);
      const xl = lerp(x2 - 30, x1 + 30, f);
      s += `<rect x="${f1(xr - 34)}" y="${f1(y - 13)}" width="68" height="26" rx="8" fill="${C.gold}"/>`;
      s += `<rect x="${f1(xl - 34)}" y="${f1(y - 13)}" width="68" height="26" rx="8" fill="${C.sky}"/>`;
      chip = "LACPDUs: agreeing on the bundle";
    } else {
      const cut = st === "failover" && k === 1;
      if (cut) {
        s += `<line x1="${x1}" y1="${f1(y)}" x2="510" y2="${f1(y)}" stroke="${C.red}" stroke-width="7"/><line x1="570" y1="${f1(y)}" x2="${x2}" y2="${f1(y)}" stroke="${C.red}" stroke-width="7"/>`;
        s += group(fresh, `<path d="M522 ${f1(y - 18)} l36 36 M558 ${f1(y - 18)} l-36 36" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`);
      } else {
        s += `<line x1="${x1}" y1="${f1(y)}" x2="${x2}" y2="${f1(y)}" stroke="${C.green}" stroke-width="8"/>`;
        s += flow(k, 0.7, 1, k * 0.13);
      }
      chip = st === "failover" ? `${n - 1} links still up: no outage` : `${n} × ${d.speed} Gbps = one ${n * d.speed} Gbps logical link`;
    }
  }
  if (st === "bundle" || st === "failover") {
    s += group(st === "bundle" ? fresh : 1,
      `<rect x="${x1 - 26}" y="${f1(ly(0) - 50)}" width="${x2 - x1 + 52}" height="${f1(ly(n - 1) - ly(0) + 100)}" rx="30" fill="none" stroke="url(#brand)" stroke-width="5"/>` +
      text(540, ly(0) - 66, "Port-channel 1", { size: 32, weight: 800, anchor: "middle", fill: C.gold }));
  }
  if (chip) {
    const w = chip.length * 17 + 70;
    s += group(fresh, `<rect x="${f1(540 - w / 2)}" y="1218" width="${f1(w)}" height="70" rx="35" fill="${C.card}" stroke="${C.edge}" stroke-width="2"/>` +
      text(540, 1265, chip, { size: 30, weight: 800, anchor: "middle", fill: st === "stp" ? C.rose : C.mint }));
  }
  return s;
}

function pointsDiagram(d, t, T0, endT) {
  let s = "";
  d.steps.forEach((st, i) => {
    const p = prog(t, T0[i] - 0.05, T0[i] + 0.4);
    if (p <= 0) return;
    const y = 480 + i * 228;
    const current = t < (T0[i + 1] ?? endT);
    const tf = fitWrap(st.text, 760, 30, 2, 0.55);
    let g = card(60, y, 960, 206, { stroke: current ? "url(#brand)" : C.edge, sw: current ? 4 : 2 });
    g += `<circle cx="130" cy="${y + 103}" r="40" fill="url(#brand)"/>` + text(130, y + 120, String(i + 1), { size: 44, weight: 900, anchor: "middle" });
    g += text(200, y + 80, st.title, { size: fitFont(st.title, 780, 42, 0.57), weight: 800 });
    g += lines(200, y + 128, tf.lines, { size: tf.size, weight: 600, fill: C.muted }, 1.3);
    s += group(p * (current ? 1 : 0.6), g, `translate(${f1((1 - p) * 120)} 0)`);
  });
  return s;
}

function conceptVideo(c) {
  const steps = c.diagram.steps;
  const n = steps.length;
  const cert = c.certs[0];
  const scenes = [
    { sub: c.hook, say: c.hookSay, min: 3.4 },
    { sub: c.def, say: c.defSay, min: 3 },
    ...steps.map((st) => ({ sub: st.sub, say: st.say, min: 2.8 })),
    { sub: c.examTip, say: c.examTipSay, min: 3 },
    { sub: `Follow for more tech, explained simply. And practice free ${shortOf(cert)} questions on certquests.com.`, min: 3.4 },
  ];
  const df = fitWrap(c.def, 860, 54, 6, 0.55);
  const tf = fitWrap(c.examTip, 860, 42, 5, 0.55);

  const frame = (t, tl) => {
    const T = tl.start;
    const T0 = T.slice(2, 2 + n);
    const diagEnd = T[2 + n];
    let s = chrome("EXPLAINED", C.sky);
    // Term: big in the hook, then a header.
    const head = prog(t, T[1] - 0.2, T[1] + 0.4);
    const pop = 0.88 + 0.12 * ease(t / 0.35);
    const ty = lerp(760, 345, head);
    const tsz = lerp(fitFont(c.term, 920, 200, 0.62), fitFont(c.term, 900, 96, 0.62), head);
    s += `<g transform="translate(540 ${f1(ty)}) scale(${f1(head > 0 ? 1 : pop)}) translate(-540 ${f1(-ty)})">` +
      text(540, ty, c.term, { size: Math.round(tsz), weight: 900, anchor: "middle", fill: "url(#brand)" }) +
      text(540, ty + lerp(90, 56, head), c.full, { size: Math.round(lerp(fitFont(c.full, 900, 50, 0.55), fitFont(c.full, 900, 34, 0.55), head)), weight: 700, anchor: "middle" }) +
      group(1 - head, text(540, ty + 150, c.kicker, { size: 30, weight: 600, anchor: "middle", fill: C.muted })) +
      `</g>`;
    // Definition card.
    const defIn = prog(t, T[1], T[1] + 0.4);
    const defOut = prog(t, T[2] - 0.1, T[2] + 0.3);
    const dh = 90 + df.lines.length * df.size * 1.3;
    const dTop = 860 - dh / 2;
    s += group(defIn * (1 - defOut),
      card(60, dTop, 960, dh, { stroke: "url(#brand)", sw: 3 }) +
      lines(540, dTop + 60 + df.size * 0.8, df.lines, { size: df.size, weight: 700, anchor: "middle" }, 1.3),
      `translate(0 ${f1((1 - defIn) * 40)})`);
    // Diagram.
    const tip = prog(t, diagEnd - 0.1, diagEnd + 0.4);
    const end = prog(t, T[3 + n] - 0.1, T[3 + n] + 0.4);
    if (t >= T[2] - 0.2) {
      const kind = c.diagram.kind;
      const body = kind === "sequence" ? seqDiagram(c.diagram, t, T0, diagEnd) : kind === "bundle" ? bundleDiagram(c.diagram, t, T0) : pointsDiagram(c.diagram, t, T0, diagEnd);
      s += group(prog(t, T[2] - 0.2, T[2] + 0.2) * lerp(1, 0.18, tip), body);
    }
    // Exam tip.
    const th = 210 + tf.lines.length * tf.size * 1.3;
    s += group(tip * (1 - end * 0.9),
      card(60, 980 - th / 2, 960, th, { stroke: C.gold, sw: 4, fillOpacity: 0.97 }) +
      label(540, 980 - th / 2 + 64, "On the exam", C.gold, 28, "middle") +
      lines(540, 980 - th / 2 + 114 + tf.size * 0.6, tf.lines, { size: tf.size, weight: 700, anchor: "middle" }, 1.3) +
      chips(540, 980 + th / 2 - 80, c.certs.map(shortOf), C.sky),
      `translate(0 ${f1((1 - tip) * 40)})`);
    s += endCard("Follow for more tech, explained", CTA_SUB(cert), "certquests.com", end);
    return s;
  };
  return {
    file: `concept-${c.id}`,
    format: "concept",
    title: c.question || `What is ${c.term}?`,
    link: c.link,
    scenes,
    frame,
    caption: captionBlock({
      title: `${c.question || `What is ${c.term}?`} ${c.full} explained in under a minute`,
      hook: c.hook,
      body: [c.def, "", ...steps.map((st) => `• ${st.sub}`), "", `📝 ${c.examTip}`, `Practice free ${c.certs.map(shortOf).join(" / ")} questions.`],
      link: c.link,
      tags: c.tags,
    }),
  };
}

// ─── Format 3: top 5 ──────────────────────────────────────────────────────────
function topVideo(tp) {
  const N = tp.items.length;
  const rankOf = (i) => N - i;
  const unit = tp.unit || "";
  const max = Math.max(...tp.items.map((it) => it.value || 0));
  const cert = tp.certs[0];
  const scenes = [
    { sub: tp.hook, min: 3.2 },
    ...tp.items.map((it, i) => ({
      sub: `Number ${rankOf(i)}: ${it.name}${it.value !== undefined ? `, ${it.value}${unit}` : ""}. ${it.line}`,
      say: spoken(`Number ${rankOf(i)}, ${it.name}${it.value !== undefined ? `, ${it.value}${unit === "%" ? " percent" : unit}` : ""}. ${it.line}`),
      min: 2.8,
    })),
    ...(tp.warning ? [{ sub: tp.warning, min: 2.6 }] : []),
    { sub: tp.outro, say: tp.outroSay, min: 2.8 },
    { sub: `Follow for more. Practice free ${shortOf(cert)} questions on certquests.com.`, min: 3.2 },
  ];
  const big = fitWrap(tp.title, 900, 84, 4, 0.58);
  const small = fitWrap(tp.title, 940, 46, 2, 0.56);
  const rowTop = (rank) => 412 + (rank - 1) * 196;

  const frame = (t, tl) => {
    const T = tl.start;
    const iWarn = tp.warning ? 1 + N : -1;
    const iOutro = 1 + N + (tp.warning ? 1 : 0);
    const iEnd = iOutro + 1;
    let s = chrome(`TOP ${N}`, C.gold);
    const head = prog(t, T[1] - 0.25, T[1] + 0.3);
    const pop = 0.9 + 0.1 * ease(t / 0.3);
    const bigH = big.lines.length * big.size * 1.12;
    s += group(1 - head,
      text(540, 760 - bigH / 2 - 60, String(N), { size: 260, weight: 900, anchor: "middle", fill: "url(#brand)", opacity: 0.9 }) +
      lines(540, 780 - bigH / 2 + big.size + 40, big.lines, { size: big.size, weight: 900, anchor: "middle" }, 1.12),
      `translate(540 860) scale(${pop.toFixed(3)}) translate(-540 -860)`);
    s += group(head, lines(540, 300 + small.size * 0.4, small.lines, { size: small.size, weight: 800, anchor: "middle" }, 1.15));
    const overlay = Math.max(tp.warning ? prog(t, T[iWarn] - 0.1, T[iWarn] + 0.35) : 0, prog(t, T[iOutro] - 0.1, T[iOutro] + 0.35));
    const end = prog(t, T[iEnd] - 0.1, T[iEnd] + 0.4);
    tp.items.forEach((it, i) => {
      const r = rankOf(i);
      const p = prog(t, T[1 + i] - 0.05, T[1 + i] + 0.4);
      if (p <= 0) return;
      const y = rowTop(r);
      const current = t < T[2 + i] || i === N - 1 && t < T[iOutro];
      const hasVal = it.value !== undefined;
      let g = card(60, y, 960, 184, { stroke: current ? "url(#brand)" : C.edge, sw: current ? 4 : 2, fill: r === 1 ? "#1A1530" : C.card });
      g += `<circle cx="128" cy="${y + 92}" r="46" fill="${r === 1 ? "url(#heat)" : "url(#brand)"}"/>` + text(128, y + 110, String(r), { size: 50, weight: 900, anchor: "middle" });
      g += text(200, y + 66, it.name, { size: fitFont(it.name, hasVal ? 520 : 780, 50, 0.6), weight: 900 });
      if (hasVal) {
        const vp = prog(t, T[1 + i] + 0.1, T[1 + i] + 1.0);
        g += text(990, y + 66, `${(it.value * vp).toFixed(1)}${unit}`, { size: 48, weight: 900, anchor: "end", fill: C.gold });
        g += `<rect x="200" y="${y + 84}" width="790" height="14" rx="7" fill="#1E293B"/><rect x="200" y="${y + 84}" width="${f1(790 * (it.value / max) * vp)}" height="14" rx="7" fill="url(#brand)"/>`;
      } else if (it.tag) {
        g += label(200, y + 104, it.tag, C.gold, 22);
      }
      const lf = fitWrap(it.line, 790, 28, 2, 0.55);
      g += lines(200, y + 138, lf.lines, { size: lf.size, weight: 600, fill: C.muted }, 1.2);
      s += group(p * lerp(1, 0.25, overlay) * (1 - end * 0.85), g, `translate(${f1((1 - p) * 140)} 0)`);
    });
    if (tp.warning) {
      const w = prog(t, T[iWarn] - 0.1, T[iWarn] + 0.35) * (1 - prog(t, T[iOutro] - 0.1, T[iOutro] + 0.3));
      const wf = fitWrap(tp.warning, 820, 46, 4, 0.55);
      s += group(w,
        card(60, 700, 960, 200 + wf.lines.length * wf.size * 1.3, { stroke: C.red, sw: 4, fillOpacity: 0.97 }) +
        `<path d="M540 730 l40 70 h-80 z" fill="none" stroke="${C.red}" stroke-width="7" stroke-linejoin="round"/>` + text(540, 790, "!", { size: 40, weight: 900, anchor: "middle", fill: C.red }) +
        lines(540, 850 + wf.size * 0.5, wf.lines, { size: wf.size, weight: 800, anchor: "middle" }, 1.3));
    }
    const o = prog(t, T[iOutro] - 0.1, T[iOutro] + 0.35) * (1 - end);
    const of = fitWrap(tp.outro, 820, 50, 4, 0.55);
    s += group(o,
      card(60, 760, 960, 160 + of.lines.length * of.size * 1.3, { stroke: "url(#brand)", sw: 4, fillOpacity: 0.97 }) +
      lines(540, 840 + of.size * 0.5, of.lines, { size: of.size, weight: 800, anchor: "middle" }, 1.3));
    if (tp.source) s += legend(tp.source, 1408, Math.max(o, prog(t, T[1], T[1] + 0.4) * (1 - end)));
    s += endCard("Follow for more", CTA_SUB(cert), "certquests.com", end);
    return s;
  };
  return {
    file: `top5-${tp.id}`,
    format: "top5",
    title: tp.title,
    link: tp.link,
    scenes,
    frame,
    caption: captionBlock({
      title: tp.title,
      hook: tp.hook,
      body: [
        ...tp.items.map((it, i) => `${rankOf(i)}. ${it.name}${it.value !== undefined ? ` (${it.value}${unit})` : it.tag ? ` · ${it.tag}` : ""}: ${it.line}`).reverse(),
        ...(tp.warning ? ["", `⚠️ ${tp.warning}`] : []),
        "",
        tp.outro,
        ...(tp.source ? [tp.source] : []),
      ],
      link: tp.link,
      tags: tp.tags,
    }),
  };
}

// ─── Format 4: incident file ──────────────────────────────────────────────────
function incidentVideo(inc) {
  const n = inc.beats.length;
  const cert = inc.certs[0];
  const isStory = inc.link.includes("/news/");
  const scenes = [
    { sub: inc.hook, say: inc.hookSay, min: 3.4 },
    ...inc.beats.map((b) => ({ sub: b.sub, say: b.say, min: 3 })),
    { sub: inc.impact.sub, say: inc.impact.say, min: 3 },
    { sub: inc.lesson, min: 3 },
    { sub: isStory ? "Read the full story on certquests.com, and follow for more incident files." : `Follow for more incident files. Practice free ${shortOf(cert)} questions on certquests.com.`, min: 3.2 },
  ];
  const big = fitWrap(inc.title, 900, 70, 4, 0.56);
  const small = fitWrap(inc.title, 940, 40, 2, 0.55);
  const lessonText = inc.lesson.replace(/^The lesson: (.)/, (_, c) => c.toUpperCase());
  const lf = fitWrap(lessonText, 860, 46, 4, 0.55);
  const beatF = inc.beats.map((b) => fitWrap(b.sub, 860, 40, 4, 0.55));
  const year = inc.date.slice(-4);

  const frame = (t, tl) => {
    const T = tl.start;
    const iImpact = 1 + n;
    const iLesson = 2 + n;
    const iEnd = 3 + n;
    let s = chrome("INCIDENT FILE", C.red);
    const head = prog(t, T[1] - 0.25, T[1] + 0.3);
    const jit = Math.sin(t * 90) * 7 * (1 - clamp01(t / 0.7));
    const bigH = big.lines.length * big.size * 1.15;
    s += group(1 - head,
      `<rect x="60" y="${f1(560 - bigH / 2)}" width="960" height="4" fill="${C.red}"/>` +
      text(540 + jit, 680 - bigH / 2, inc.date, { size: 100, weight: 800, family: MONO, anchor: "middle", fill: C.red }) +
      lines(540, 790 - bigH / 2 + big.size, big.lines, { size: big.size, weight: 900, anchor: "middle" }, 1.15) +
      `<rect x="60" y="${f1(850 + bigH / 2)}" width="960" height="4" fill="${C.red}"/>`);
    s += group(head,
      text(60, 316, inc.date, { size: 32, weight: 800, family: MONO, fill: C.red }) +
      lines(60, 372, small.lines, { size: small.size, weight: 800 }, 1.18));
    const impact = prog(t, T[iImpact] - 0.1, T[iImpact] + 0.35);
    const lesson = prog(t, T[iLesson] - 0.1, T[iLesson] + 0.35);
    const end = prog(t, T[iEnd] - 0.1, T[iEnd] + 0.4);
    const dim = lerp(1, 0.07, Math.max(impact, lesson));
    // Timeline.
    const yB = (i) => 500 + i * 300;
    const shown = inc.beats.filter((_, i) => t >= T[1 + i] - 0.05).length;
    if (shown) {
      const grow = prog(t, T[shown] - 0.05, T[shown] + 0.5);
      const yEnd = lerp(yB(Math.max(0, shown - 1)), yB(shown - 1) + 200, grow);
      s += group(dim * (1 - end), `<line x1="96" y1="${yB(0) + 14}" x2="96" y2="${f1(yEnd)}" stroke="${C.red}" stroke-opacity="0.5" stroke-width="4"/>`);
    }
    inc.beats.forEach((b, i) => {
      const p = prog(t, T[1 + i] - 0.05, T[1 + i] + 0.4);
      if (p <= 0) return;
      const y = yB(i);
      const current = t < T[2 + i];
      let g = `<circle cx="96" cy="${y + 14}" r="16" fill="${current ? C.red : "#7F1D1D"}" stroke="${C.rose}" stroke-width="3"/>`;
      g += label(140, y + 24, b.label, C.gold, 28);
      g += lines(140, y + 72 + beatF[i].size * 0.5, beatF[i].lines, { size: beatF[i].size, weight: 700, fill: current ? C.ink : C.muted }, 1.25);
      s += group(p * dim * (1 - end), g, `translate(${f1((1 - p) * 80)} 0)`);
    });
    // Impact counter.
    const cnt = prog(t, T[iImpact] + 0.1, T[iImpact] + 1.5);
    const dec = inc.impact.decimals ?? (inc.impact.value % 1 ? 1 : 0);
    const num = `${(inc.impact.value * cnt).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })}${inc.impact.suffix}`;
    s += group(impact * (1 - lesson),
      card(60, 700, 960, 380, { stroke: C.red, sw: 4, fillOpacity: 0.97 }) +
      text(540, 900, num, { size: fitFont(num, 900, 230, 0.62), weight: 900, anchor: "middle", fill: "url(#alarm)" }) +
      text(540, 990, inc.impact.label, { size: fitFont(inc.impact.label, 900, 44, 0.55), weight: 800, anchor: "middle" }),
      `translate(540 900) scale(${f1(0.85 + 0.15 * impact)}) translate(-540 -900)`);
    // Lesson.
    const lh = 260 + lf.lines.length * lf.size * 1.3;
    s += group(lesson * (1 - end * 0.9),
      card(60, 960 - lh / 2, 960, lh, { stroke: C.gold, sw: 4, fillOpacity: 0.97 }) +
      label(540, 960 - lh / 2 + 66, "Lesson learned", C.gold, 28, "middle") +
      lines(540, 960 - lh / 2 + 120 + lf.size * 0.6, lf.lines, { size: lf.size, weight: 800, anchor: "middle" }, 1.3) +
      chips(540, 960 + lh / 2 - 84, inc.certs.map(shortOf), C.sky),
      `translate(0 ${f1((1 - lesson) * 40)})`);
    s += legend(inc.source, 1408, Math.min(1, prog(t, T[1], T[1] + 0.4)) * (1 - end));
    s += endCard(isStory ? "Read the full story" : "Follow for more incident files", isStory ? "Timeline, root cause and what it means for your exam." : CTA_SUB(cert), "certquests.com", end);
    return s;
  };
  return {
    file: `incident-${inc.id}`,
    format: "incident",
    title: inc.title,
    link: inc.link,
    scenes,
    frame,
    caption: captionBlock({
      title: `${inc.title} (${year})`,
      hook: inc.hook,
      body: [...inc.beats.map((b) => `${b.label}: ${b.sub}`), "", `💥 ${inc.impact.sub}`, `💡 ${inc.lesson}`, "", inc.source],
      link: inc.link,
      tags: inc.tags,
    }),
  };
}

// ─── Format 5: cert duel ──────────────────────────────────────────────────────
function duelVideo(cmp) {
  const [A, B] = cmp.certs;
  const pa = PACKS.get(A.id);
  const pb = PACKS.get(B.id);
  const sa = pa.short || A.examCode;
  const sb = pb.short || B.examCode;
  const link = `${SITE}/compare/${cmp.slug}/`;
  const verdicts = cmp.verdicts.slice(0, 3);
  const winnerShort = (id) => (id === A.id ? sa : id === B.id ? sb : shortOf(id));
  // No study-time row: index.json est_hours and the comparisons' own prose disagree for some pairs (CCNA 300 h
  // vs "200 hours"), and a short must not contradict itself.
  const hasHours = false;
  const scenes = [
    { sub: `${sa} or ${sb}: which one should you take first?`, min: 3.2 },
    { sub: `Exam fee: $${A.examFeeUsd} for ${sa}, $${B.examFeeUsd} for ${sb}.`, min: 2.6 },
    ...(hasHours ? [{ sub: `Study time: about ${pa.est_hours} hours for ${sa}, ${pb.est_hours} for ${sb}.`, min: 2.6 }] : []),
    ...verdicts.map((v) => ({ sub: `${v.profile} Pick ${winnerShort(v.winner)}.`, min: 3 })),
    { sub: cmp.tldr, min: 3.2 },
    { sub: "The full comparison is on certquests.com. Which one are you taking? Tell us in the comments.", min: 3.4 },
  ];
  const off = hasHours ? 3 : 2;
  const colA = A.color || C.blue;
  const colB = B.color || C.violet;
  const tl = fitWrap(cmp.tldr, 860, 46, 6, 0.55);

  const frame = (t, tline) => {
    const T = tline.start;
    const iT = off + verdicts.length;
    const iEnd = iT + 1;
    let s = chrome("CERT DUEL", C.violet);
    const head = prog(t, T[1] - 0.25, T[1] + 0.35);
    const slideA = prog(t, 0, 0.5);
    const slideB = prog(t, 0.1, 0.6);
    const end = prog(t, T[iEnd] - 0.1, T[iEnd] + 0.4);
    // Cert cards: big in the hook, header afterwards.
    const ch = lerp(560, 200, head);
    const cy = lerp(520, 276, head);
    const winnerNow = (() => {
      for (let i = verdicts.length - 1; i >= 0; i--) if (t >= T[off + i] && t < T[iT]) return verdicts[i].winner;
      return null;
    })();
    for (const [side, cert, pk, sh, col, sl] of [[0, A, pa, sa, colA, slideA], [1, B, pb, sb, colB, slideB]]) {
      const x = side === 0 ? lerp(-500, 60, sl) : lerp(1080, 560, sl);
      const win = winnerNow === cert.id;
      let g = card(x, cy, 460, ch, { stroke: win ? col : C.edge, sw: win ? 6 : 2, fill: C.card });
      g += `<rect x="${f1(x)}" y="${f1(cy)}" width="460" height="14" rx="7" fill="${col}"/>`;
      g += text(x + 230, cy + lerp(90, 56, head), cert.vendor, { size: Math.round(lerp(30, 24, head)), weight: 700, anchor: "middle", fill: C.muted });
      g += text(x + 230, cy + lerp(210, 132, head), sh, { size: fitFont(sh, 400, Math.round(lerp(96, 60, head)), 0.62), weight: 900, anchor: "middle" });
      g += text(x + 230, cy + lerp(275, 178, head), cert.examCode, { size: Math.round(lerp(32, 26, head)), weight: 700, family: MONO, anchor: "middle", fill: col === "#C8203C" ? C.rose : C.sky });
      const nm = fitWrap(cert.displayName, 400, 28, 3, 0.55);
      g += group(1 - head, lines(x + 230, cy + 350, nm.lines, { size: nm.size, weight: 600, anchor: "middle", fill: C.muted }, 1.25));
      s += group(1 - end * 0.85, g);
    }
    s += group((1 - head) * slideB, `<circle cx="540" cy="800" r="66" fill="url(#brand)"/>` + text(540, 820, "VS", { size: 54, weight: 900, anchor: "middle" }));
    // Stat rows: mirrored bars.
    const row = (i, y, title, va, vb, fmt, lowerWins) => {
      const p = prog(t, T[i] - 0.05, T[i] + 0.6);
      if (p <= 0) return "";
      const m = Math.max(va, vb);
      const winA = lowerWins && va < vb;
      const winB = lowerWins && vb < va;
      const fillA = lowerWins ? (winA ? C.green : C.dim) : colA;
      const fillB = lowerWins ? (winB ? C.green : C.dim) : colB;
      let g = label(540, y + 30, title, C.gold, 24, "middle");
      g += `<rect x="${f1(525 - 400 * (va / m) * p)}" y="${y + 50}" width="${f1(400 * (va / m) * p)}" height="44" rx="12" fill="${fillA}"/>`;
      g += `<rect x="555" y="${y + 50}" width="${f1(400 * (vb / m) * p)}" height="44" rx="12" fill="${fillB}"/>`;
      g += text(510, y + 132, fmt(va), { size: 36, weight: 900, anchor: "end", fill: winA ? C.mint : C.ink });
      g += text(570, y + 132, fmt(vb), { size: 36, weight: 900, fill: winB ? C.mint : C.ink });
      return group(p * (1 - end * 0.85) * lerp(1, 0.35, prog(t, T[iT] - 0.1, T[iT] + 0.3)), g);
    };
    s += row(1, 520, "Exam fee", A.examFeeUsd, B.examFeeUsd, (v) => `$${v}`, true);
    if (hasHours) s += row(2, 660, "Study time", pa.est_hours, pb.est_hours, (v) => `~${v} h`, false);
    // Verdicts: one card at a time.
    verdicts.forEach((v, i) => {
      const a = prog(t, T[off + i] - 0.05, T[off + i] + 0.35);
      const b = prog(t, (T[off + i + 1] ?? T[iT]) - 0.1, (T[off + i + 1] ?? T[iT]) + 0.2);
      const op = a * (1 - b);
      if (op <= 0) return;
      const pf = fitWrap(v.profile, 860, 48, 4, 0.55);
      const wsh = winnerShort(v.winner);
      const col = v.winner === A.id ? colA : colB;
      const y = 760;
      const by = y + 110 + pf.lines.length * pf.size * 1.28 + 10;
      let g = card(60, y, 960, by - y + 130, { stroke: col, sw: 4, fillOpacity: 0.96 });
      g += label(100, y + 62, `If this is you · ${i + 1}/${verdicts.length}`, C.gold, 24);
      g += lines(100, y + 110 + pf.size * 0.8, pf.lines, { size: pf.size, weight: 800 }, 1.28);
      g += `<rect x="100" y="${f1(by)}" width="${f1(wsh.length * 34 + 220)}" height="84" rx="42" fill="${col}"/>`;
      g += text(140, by + 57, `PICK ${wsh}`, { size: 42, weight: 900 });
      g += `<path d="M${v.winner === A.id ? 250 : 830} ${y - 14} l-22 30 h44 z" fill="${col}"/>`;
      s += group(op, g, `translate(0 ${f1((1 - a) * 40)})`);
    });
    const tp = prog(t, T[iT] - 0.1, T[iT] + 0.35);
    s += group(tp * (1 - end * 0.9),
      card(60, 760, 960, 150 + tl.lines.length * tl.size * 1.3, { stroke: "url(#brand)", sw: 4, fillOpacity: 0.97 }) +
      label(100, 822, "TL;DR", C.gold, 26) +
      lines(100, 880 + tl.size * 0.5, tl.lines, { size: tl.size, weight: 800 }, 1.3));
    s += legend(`Exam fees in USD · CertQuests comparison, reviewed ${cmp.lastReviewed}`, 1408, prog(t, T[1], T[1] + 0.4) * (1 - end));
    s += endCard("Full comparison", "Fees, study time, salaries and which one to take first.", "certquests.com", end);
    return s;
  };
  return {
    file: `duel-${cmp.slug}`,
    format: "duel",
    title: `${sa} vs ${sb}: which first?`,
    link,
    scenes,
    frame,
    caption: captionBlock({
      title: `${sa} vs ${sb}: which one should you take first?`,
      hook: `${sa} or ${sb}? Here's how to choose.`,
      body: [
        `💵 Exam fee: $${A.examFeeUsd} (${sa}) vs $${B.examFeeUsd} (${sb})`,
        ...(hasHours ? [`⏱️ Study time: ~${pa.est_hours} h vs ~${pb.est_hours} h`] : []),
        "",
        ...verdicts.map((v) => `→ ${v.profile} ${winnerShort(v.winner)}.`),
        "",
        `TL;DR: ${cmp.tldr}`,
      ],
      link,
      tags: [tagOf(sa), tagOf(sb), "#certification", "#careeradvice"],
    }),
  };
}

// ─── Format 6: tech news ──────────────────────────────────────────────────────
function newsVideo(nw) {
  const n = nw.facts.length;
  const cert = nw.certs[0];
  const scenes = [
    { sub: nw.hook, min: 3.2 },
    ...nw.facts.map((f) => ({ sub: f.sub, say: f.say, min: 2.8 })),
    { sub: nw.takeaway, min: 3 },
    { sub: "Follow for tech news, explained in under a minute.", min: 2.8 },
  ];
  const big = fitWrap(nw.title, 900, 78, 4, 0.57);
  const small = fitWrap(nw.title, 940, 42, 2, 0.55);
  const tk = fitWrap(nw.takeaway, 860, 44, 5, 0.55);
  const frame = (t, tl) => {
    const T = tl.start;
    const iTake = 1 + n;
    const iEnd = 2 + n;
    let s = chrome("TECH NEWS", C.sky);
    const head = prog(t, T[1] - 0.25, T[1] + 0.3);
    const pop = 0.9 + 0.1 * ease(t / 0.3);
    const bigH = big.lines.length * big.size * 1.12;
    s += group(1 - head,
      text(540, 700 - bigH / 2, nw.date, { size: 44, weight: 800, family: MONO, anchor: "middle", fill: C.sky }) +
      lines(540, 790 - bigH / 2 + big.size, big.lines, { size: big.size, weight: 900, anchor: "middle" }, 1.12),
      `translate(540 860) scale(${pop.toFixed(3)}) translate(-540 -860)`);
    s += group(head, text(60, 312, nw.date, { size: 30, weight: 800, family: MONO, fill: C.sky }) + lines(60, 366, small.lines, { size: small.size, weight: 800 }, 1.18));
    const take = prog(t, T[iTake] - 0.1, T[iTake] + 0.35);
    const end = prog(t, T[iEnd] - 0.1, T[iEnd] + 0.4);
    nw.facts.forEach((f, i) => {
      const p = prog(t, T[1 + i] - 0.05, T[1 + i] + 0.4);
      if (p <= 0) return;
      const y = 490 + i * 300;
      const current = t < T[2 + i];
      const lf = fitWrap(f.label, 470, 44, 3, 0.55);
      let g = card(60, y, 960, 270, { stroke: current ? "url(#brand)" : C.edge, sw: current ? 4 : 2 });
      g += text(260, y + 170, f.big, { size: fitFont(f.big, 360, 120, 0.62), weight: 900, anchor: "middle", fill: "url(#cool)" });
      g += lines(500, y + 135 - ((lf.lines.length - 1) * lf.size * 1.25) / 2 + lf.size * 0.35, lf.lines, { size: lf.size, weight: 800 }, 1.25);
      s += group(p * lerp(1, 0.18, take) * (1 - end), g, `translate(${f1((1 - p) * 120)} 0)`);
    });
    const th = 200 + tk.lines.length * tk.size * 1.3;
    s += group(take * (1 - end * 0.9),
      card(60, 960 - th / 2, 960, th, { stroke: C.gold, sw: 4, fillOpacity: 0.97 }) +
      label(540, 960 - th / 2 + 66, "What it means", C.gold, 28, "middle") +
      lines(540, 960 - th / 2 + 120 + tk.size * 0.6, tk.lines, { size: tk.size, weight: 800, anchor: "middle" }, 1.3),
      `translate(0 ${f1((1 - take) * 40)})`);
    s += legend(nw.source, 1408, prog(t, T[1], T[1] + 0.4) * (1 - end));
    s += endCard("Follow for tech news, explained", "What matters for your IT career, in under a minute.", "certquests.com", end);
    return s;
  };
  return {
    file: `news-${nw.id}`,
    format: "news",
    title: nw.title,
    link: nw.link,
    scenes,
    frame,
    caption: captionBlock({
      title: nw.title,
      hook: nw.hook,
      body: [...nw.facts.map((f) => `• ${f.sub}`), "", nw.takeaway, "", nw.source],
      link: nw.link,
      tags: nw.tags,
    }),
  };
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
const DAY = 86400000;
const LAUNCH = Date.UTC(2026, 10, 30); // slot 0: Monday 2026-11-30
const PUBLISH_WEEKDAYS = [1, 3, 5, 0]; // Monday, Wednesday, Friday, Sunday (UTC)
const CYCLE = ["top5", "quiz", "concept", "incident", "duel", "quiz", "concept", "incident"];

const dayOf = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10);
const isPublishDay = (ms) => ms >= LAUNCH && PUBLISH_WEEKDAYS.includes(new Date(ms).getUTCDay());

/** Last publish day ≤ ms (a late run lands on the slot it was meant for). */
function slotDay(ms) {
  let d = ms;
  while (d > LAUNCH && !isPublishDay(d)) d -= DAY;
  return Math.max(d, LAUNCH);
}
function slotIndex(ms) {
  let n = 0;
  for (let d = LAUNCH; d < ms; d += DAY) if (isPublishDay(d)) n++;
  return n;
}
const slotFormat = (idx, ms) => TOPICS.calendar?.[isoOf(ms)]?.format || CYCLE[idx % CYCLE.length];

function byId(list, id, kind) {
  const x = list.find((e) => e.id === id || e.slug === id);
  if (!x) throw new Error(`unknown ${kind}: ${id}`);
  return x;
}

let usableQuiz = null;
function quizFor(k, packHint) {
  if (packHint) {
    const pq = quizQuestions(packHint);
    if (!pq) throw new Error(`no usable quiz question in ${packHint}`);
    return quizVideo(pq.pack, pq.qs[3 % pq.qs.length]);
  }
  usableQuiz ??= QUIZ_PACKS.map(quizQuestions).filter(Boolean);
  if (!usableQuiz.length) throw new Error("no usable quiz question");
  const pq = usableQuiz[k % usableQuiz.length];
  const round = Math.floor(k / usableQuiz.length);
  return quizVideo(pq.pack, pq.qs[(round * 7 + 3) % pq.qs.length]);
}

function videoFor(format, k, id) {
  if (format === "quiz") return quizFor(k, id);
  if (format === "concept") return conceptVideo(id ? byId(TOPICS.concepts, id, "concept") : TOPICS.concepts[k % TOPICS.concepts.length]);
  if (format === "top5") return topVideo(id ? byId(TOPICS.tops, id, "top 5") : TOPICS.tops[k % TOPICS.tops.length]);
  if (format === "incident") return incidentVideo(id ? byId(TOPICS.incidents, id, "incident") : TOPICS.incidents[k % TOPICS.incidents.length]);
  if (format === "news") return newsVideo(id ? byId(TOPICS.news, id, "news") : TOPICS.news[k % TOPICS.news.length]);
  if (format === "duel") {
    const list = duels();
    return duelVideo(id ? byId(list, id, "comparison") : list[k % list.length]);
  }
  throw new Error(`unknown format: ${format}`);
}

function videoForSlot(ms) {
  const idx = slotIndex(ms);
  const pin = TOPICS.calendar?.[isoOf(ms)];
  if (pin) return videoFor(pin.format, 0, pin.id);
  const format = CYCLE[idx % CYCLE.length];
  // k = how many earlier slots used this format from its own list (pinned dates don't consume it).
  let k = 0;
  for (let d = LAUNCH, j = 0; d < ms; d += DAY) {
    if (!isPublishDay(d)) continue;
    if (!TOPICS.calendar?.[isoOf(d)] && CYCLE[j % CYCLE.length] === format) k++;
    j++;
  }
  return videoFor(format, k);
}

// ─── Rendering ────────────────────────────────────────────────────────────────
async function urlOk(url) {
  try {
    return (await fetch(url, { method: "HEAD", redirect: "follow" })).ok;
  } catch {
    return false;
  }
}

async function render(v, stills) {
  const clips = [];
  for (const s of v.scenes) clips.push(stills ? null : await tts(spoken(s.say || s.sub)));
  const hasVoice = clips.every(Boolean);
  if (!stills && !hasVoice) {
    if (args.includes("--require-voice")) throw new Error(`${v.file}: no voice (TTS key missing or TTS failed)`);
    console.warn(`${v.file}: no voice (no TTS key or TTS failed): music only`);
  }
  const dur = v.scenes.map((s, i) => (hasVoice ? clips[i].seconds : estimate(s.say || s.sub)));
  const tl = timeline(v.scenes, dur);
  const chunks = subtitleChunks(v.scenes, tl);
  const frameAt = (t) => v.frame(t, tl) + subtitleSvg(chunks, t);
  if (stills) {
    const times = [1.5, ...tl.start.slice(1).map((s, i) => Math.min(tl.end[i + 1] - 0.05, s + 1.3)), tl.total - 0.5];
    for (const tt of times) fs.writeFileSync(path.join(OUT, `${v.file}-t${tt.toFixed(1).padStart(4, "0")}.jpg`), await renderFrame(frameAt(tt)));
    return { seconds: tl.total, hasVoice };
  }
  const voice = new Int16Array(Math.ceil(tl.total * SR));
  const mix = (pcm, at) => {
    const o = Math.round(at * SR);
    for (let i = 0; i < pcm.length && o + i < voice.length; i++) voice[o + i] = Math.max(-32767, Math.min(32767, voice[o + i] + pcm[i]));
  };
  if (hasVoice) clips.forEach((c, i) => mix(c.pcm, tl.voice[i]));
  for (const fx of v.sfx ? v.sfx(tl) : []) mix(fx.pcm, fx.t);
  const tmp = path.join(OUT, `.${v.file}`);
  writeWav(`${tmp}-voice.wav`, voice);
  writeWav(`${tmp}-music.wav`, music(tl.total, v.file.length * 31 + 7));
  await encode(path.join(OUT, `${v.file}.mp4`), tl.total, frameAt, `${tmp}-voice.wav`, `${tmp}-music.wav`, hasVoice);
  for (const ext of ["-voice.wav", "-music.wav"]) fs.rmSync(`${tmp}${ext}`, { force: true });
  fs.writeFileSync(path.join(OUT, `${v.file}.srt`), toSrt(chunks));
  return { seconds: tl.total, hasVoice };
}

async function main() {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const stills = args.includes("--stills");
  const jobs = [];
  if (arg("pick")) {
    for (const p of arg("pick").split(",")) {
      const [format, id] = p.split(":");
      const v = videoFor(format, 0, id);
      jobs.push({ video: { ...v, file: `${isoOf(today)}-${v.file}` }, slot: null });
    }
  } else {
    const from = arg("from") ? dayOf(arg("from")) : arg("slot") ? dayOf(arg("slot")) : today;
    const count = Number(arg("count") || 1);
    let d = arg("count") ? Math.max(from, LAUNCH) : slotDay(from);
    while (jobs.length < count) {
      if (isPublishDay(d)) {
        const v = videoForSlot(d);
        jobs.push({ video: { ...v, file: `${isoOf(d)}-${v.file}` }, slot: isoOf(d) });
      }
      d += DAY;
    }
  }
  if (args.includes("--plan")) {
    for (const j of jobs) console.log(`${j.slot || "manual"} · ${j.video.format.padEnd(8)} · ${j.video.title} · ${j.video.link}`);
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = [];
  for (const { video: v, slot } of jobs) {
    const linkOk = await urlOk(v.link);
    if (!linkOk) console.warn(`⚠ link not verified (${v.link}): check before publishing`);
    const t0 = Date.now();
    const r = await render(v, stills);
    if (stills) {
      console.log(`✓ stills ${v.file} (${r.seconds.toFixed(1)} s estimated)`);
      continue;
    }
    fs.writeFileSync(path.join(OUT, `${v.file}.txt`), v.caption + "\n");
    manifest.push({ file: `${v.file}.mp4`, slot, format: v.format, link: v.link, seconds: Math.round(r.seconds * 10) / 10, title: v.title, linkOk, voice: r.hasVoice });
    console.log(`✓ ${v.file}.mp4 (${r.seconds.toFixed(1)} s, voice: ${r.hasVoice ? "yes" : "no"}, rendered in ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  if (!stills) fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
