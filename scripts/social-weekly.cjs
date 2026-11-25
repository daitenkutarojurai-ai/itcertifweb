/**
 * Weekly Facebook + Instagram post (page "CertsQuests", @certquets).
 * Run by .github/workflows/social-weekly.yml; by hand:
 *   node scripts/social-weekly.cjs --dry-run [--week N]
 *
 * Odd ISO week = practice question of the week (data/free/*.json, answer in the caption);
 * even ISO week = salary check (data/salary/*.france.json, the page /salaire/<cert>/france/).
 * Every figure comes from the same JSON the site renders. Image: OpenAI background with no
 * text at all (image models garble words), question/figures drawn as SVG by sharp.
 *
 * Env: FB_ACCESS_TOKEN (page token), FB_PAGE_ID, IG_USER_ID, OPENAI_API_KEY.
 * Locally .env.local is read if present. Needs `sharp` (the workflow installs it).
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = process.cwd();
const SITE = "https://certquests.com";
const GRAPH = "https://graph.facebook.com/v21.0";
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const weekArg = args.indexOf("--week");

if (fs.existsSync(path.join(ROOT, ".env.local"))) {
  for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

// Biggest, most searched banks first; question posts rotate through them.
const QUESTION_PACKS = ["aws-clf-c02", "az-900", "aws-saa-c03", "sc-900", "ms-900", "az-305", "az-500", "aws-soa-c02", "aws-dva-c02", "ccnp-encor", "aws-scs-c02"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const eur = (n) => `€${Math.round(n / 1000)}k`;
const tag = (s) => "#" + s.replace(/[^A-Za-z0-9]/g, "");

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}

function wrap(text, max) {
  const lines = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if ((cur + " " + w).trim().length > max) { if (cur) lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

async function urlOk(url) {
  try { return (await fetch(url, { method: "HEAD", redirect: "follow" })).ok; } catch { return false; }
}

function packs() {
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, "data/index.json"), "utf8"));
  const m = new Map();
  for (const b of idx.brands) for (const p of b.packs) m.set(p.id, { ...p, brand: b.name });
  return m;
}

const SANS = "DejaVu Sans, Segoe UI, Arial, sans-serif";
const W = 1080, H = 1350;
const frame = (badge, P) => `
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06080f" stop-opacity="0"/><stop offset="1" stop-color="#06080f"/></linearGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b82f6"/><stop offset="0.5" stop-color="#a855f7"/><stop offset="1" stop-color="#fbbf24"/></linearGradient>
  </defs>
  <rect x="0" y="${H - P - 160}" width="${W}" height="160" fill="url(#fade)"/>
  <rect x="0" y="${H - P}" width="${W}" height="${P}" fill="#06080f"/>
  <rect x="0" y="${H - 14}" width="${W}" height="14" fill="url(#brand)"/>
  <rect x="64" y="64" rx="26" width="${badge.length * 17 + 56}" height="58" fill="#06080f" fill-opacity="0.85" stroke="#3b82f6" stroke-width="2"/>
  <text x="90" y="103" font-family="${SANS}" font-size="28" font-weight="700" fill="#93c5fd">${esc(badge)}</text>
  <text x="64" y="${H - 52}" font-family="${SANS}" font-size="38" font-weight="800" fill="#FFFFFF">certquests.com</text>`;

function questionPost(week) {
  const all = packs();
  for (let i = 0; i < QUESTION_PACKS.length; i++) {
    const pack = all.get(QUESTION_PACKS[(Math.floor(week / 2) + i) % QUESTION_PACKS.length]);
    if (!pack || !pack.available || pack.rewrite_status === "in-progress") continue;
    const bank = JSON.parse(fs.readFileSync(path.join(ROOT, "data", pack.file), "utf8"));
    const qs = (bank.questions || bank).filter((q) =>
      Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.correct) && q.explanation &&
      q.question.length <= 240 && q.options.every((o) => o.length <= 70) && !/which of the following .* not/i.test(q.question));
    if (!qs.length) continue;
    const q = qs[(week * 7) % qs.length];
    const L = "ABCD";
    const link = `${SITE}/train.html?pack=${pack.id}`;
    const caption = `${pack.name}: question of the week

${q.question}

${q.options.map((o, k) => `${L[k]}) ${o}`).join("\n")}

Your answer in the comments.
.
.
.
Answer: ${L[q.correct]}) ${q.options[q.correct]}
${q.explanation}

Practice ${pack.question_count} free ${pack.short || pack.name} questions: ${link.replace("https://", "")}

${tag(pack.brand)} ${tag(pack.short || pack.id)} #ITcertification #examprep #cloud #learnIT`;
    const qLines = wrap(q.question, 44);
    const P = 640;
    const top = H - P + 70;
    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${frame("Question of the week", P)}
      <text x="64" y="${top}" font-family="${SANS}" font-size="30" font-weight="700" fill="#fbbf24">${esc(pack.name)}</text>
      ${qLines.map((l, k) => `<text x="64" y="${top + 58 + k * 44}" font-family="${SANS}" font-size="36" font-weight="700" fill="#FFFFFF">${esc(l)}</text>`).join("")}
      ${q.options.map((o, k) => `<text x="64" y="${top + 82 + qLines.length * 44 + k * 52}" font-family="${SANS}" font-size="30" fill="#CBD5E1"><tspan font-weight="800" fill="#93c5fd">${L[k]}</tspan>  ${esc(o)}</text>`).join("")}
      <text x="${W - 64}" y="${H - 52}" text-anchor="end" font-family="${SANS}" font-size="28" fill="#94a3b8">Answer in the caption</text></svg>`;
    return { kind: "question", caption, link, svg, P, prompt: `Abstract futuristic illustration of cloud computing and networking: glowing server racks, network nodes and data streams connected by light, dark navy background with electric blue, violet and gold accents, cinematic depth, clean modern digital art. Absolutely no text, no letters, no numbers, no logos, no screens with writing.` };
  }
  return null;
}

function salaryPost(week) {
  const files = fs.readdirSync(path.join(ROOT, "data/salary")).filter((f) => f.endsWith(".france.json")).sort();
  for (let i = 0; i < files.length; i++) {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data/salary", files[(week / 2 + i) % files.length]), "utf8"));
    const b = d.bands;
    if (!b?.junior || !b?.senior || !b?.lead) continue;
    const link = `${SITE}/salaire/${d.cert}/france/`;
    const sources = (d.sources || []).map((s) => s.name.split(" — ")[0]).slice(0, 4).join(", ");
    const caption = `What does ${d.certTitle} pay in France?

Junior (${b.junior.yoe}): ${eur(b.junior.median)} median (${eur(b.junior.min)} to ${eur(b.junior.max)})
Senior (${b.senior.yoe}): ${eur(b.senior.median)} median (${eur(b.senior.min)} to ${eur(b.senior.max)})
Lead (${b.lead.yoe}): ${eur(b.lead.median)} median (${eur(b.lead.min)} to ${eur(b.lead.max)})
Gross annual salary.${d.roi?.examCostEur ? ` Exam fee: €${d.roi.examCostEur}.` : ""}

Sources: ${sources}. Last reviewed ${d.lastReviewed}.
Full breakdown, typical jobs and 5-year progression: ${link.replace("https://", "")}

${tag(d.cert)} #ITsalary #ITcertification #techcareers #France`;
    const P = 600;
    const row = (label, band, y, color) => `
      <text x="64" y="${y}" font-family="${SANS}" font-size="32" fill="#CBD5E1">${esc(label)} <tspan font-size="24" fill="#64748b">${esc(band.yoe)}</tspan></text>
      <text x="${W - 64}" y="${y}" text-anchor="end" font-family="${SANS}" font-size="56" font-weight="800" fill="${color}">${esc(eur(band.median))}</text>`;
    const tl = wrap(d.certTitle, 34);
    const top = H - P + 70;
    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${frame("Salary check · France", P)}
      ${tl.map((l, k) => `<text x="64" y="${top + k * 50}" font-family="${SANS}" font-size="42" font-weight="800" fill="#FFFFFF">${esc(l)}</text>`).join("")}
      <text x="64" y="${top + tl.length * 50 + 14}" font-family="${SANS}" font-size="26" fill="#94a3b8">Median gross annual salary</text>
      ${row("Junior", b.junior, top + tl.length * 50 + 100, "#93c5fd")}
      ${row("Senior", b.senior, top + tl.length * 50 + 180, "#c4b5fd")}
      ${row("Lead", b.lead, top + tl.length * 50 + 260, "#fbbf24")}
      <text x="64" y="${H - 110}" font-family="${SANS}" font-size="22" fill="#64748b">${esc(`Sources: ${sources} · reviewed ${d.lastReviewed}`)}</text></svg>`;
    return { kind: "salary", caption, link, svg, P, prompt: `Abstract futuristic illustration of a tech career path: an ascending glowing staircase made of circuit-board patterns rising toward a bright horizon, dark navy background with electric blue, violet and gold accents, cinematic, clean modern digital art. Absolutely no text, no letters, no numbers, no logos, no currency symbols.` };
  }
  return null;
}

async function makeImage(post, outDir) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-2", prompt: post.prompt, size: "1024x1536", quality: "high", n: 1 }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`OpenAI: ${JSON.stringify(j.error || j)}`);
  const bg = await sharp(Buffer.from(j.data[0].b64_json, "base64")).resize(W, H - post.P + 120, { fit: "cover", position: "top" }).toBuffer();
  const file = path.join(outDir, `${post.kind}.jpg`);
  await sharp({ create: { width: W, height: H, channels: 3, background: "#06080f" } })
    .composite([{ input: bg, top: 0, left: 0 }, { input: Buffer.from(post.svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toFile(file);
  return file;
}

async function graph(p, body) {
  const res = await fetch(`${GRAPH}/${p}`, { method: "POST", body });
  const j = await res.json();
  if (!res.ok || j.error) throw new Error(`Graph ${p}: ${JSON.stringify(j.error || j)}`);
  return j;
}

async function publish(post, file) {
  const token = process.env.FB_ACCESS_TOKEN, page = process.env.FB_PAGE_ID, ig = process.env.IG_USER_ID;
  const fd = new FormData();
  fd.append("source", new Blob([fs.readFileSync(file)], { type: "image/jpeg" }), "post.jpg");
  fd.append("message", post.caption);
  fd.append("access_token", token);
  const photo = await graph(`${page}/photos`, fd);
  const info = await (await fetch(`${GRAPH}/${photo.id}?fields=images&access_token=${token}`)).json();
  const imageUrl = info.images.sort((a, b) => b.width - a.width)[0].source;
  const container = await graph(`${ig}/media`, new URLSearchParams({ image_url: imageUrl, caption: post.caption, access_token: token }));
  for (let i = 0; i < 30; i++) {
    const s = await (await fetch(`${GRAPH}/${container.id}?fields=status_code&access_token=${token}`)).json();
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR") throw new Error("Instagram rejected the image");
    await new Promise((r) => setTimeout(r, 3000));
  }
  const media = await graph(`${ig}/media_publish`, new URLSearchParams({ creation_id: container.id, access_token: token }));
  const igInfo = await (await fetch(`${GRAPH}/${media.id}?fields=permalink&access_token=${token}`)).json();
  return { facebook: `https://www.facebook.com/${(photo.post_id || photo.id).replace("_", "/posts/")}`, instagram: igInfo.permalink };
}

async function main() {
  const week = weekArg !== -1 ? Number(args[weekArg + 1]) : isoWeek(new Date());
  let post = week % 2 === 1 ? questionPost(week) : salaryPost(week);
  if (!post || !(await urlOk(post.link))) post = questionPost(week + 1) || salaryPost(week + 1);
  if (!post || !(await urlOk(post.link))) throw new Error("no valid post for this week");
  const outDir = path.join(ROOT, "social-out");
  fs.mkdirSync(outDir, { recursive: true });
  const file = await makeImage(post, outDir);
  fs.writeFileSync(path.join(outDir, `${post.kind}.txt`), post.caption);
  console.log(`week ${week} · ${post.kind} · ${post.link}\n\n${post.caption}\n`);
  let result = "dry-run: nothing published";
  if (!DRY) {
    const r = await publish(post, file);
    result = `Facebook: ${r.facebook}\nInstagram: ${r.instagram}`;
  }
  console.log(result);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Week ${week} post (${post.kind})\n\n${result.replace(/\n/g, "  \n")}\n\n\`\`\`\n${post.caption}\n\`\`\`\n`);
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
