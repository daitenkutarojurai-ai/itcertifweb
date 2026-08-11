#!/usr/bin/env node
/**
 * scripts/wire-content.mjs
 *
 * Repairs the wiring that `npm run audit-content` refuses to deploy without.
 *
 * WHY THIS EXISTS
 * The audit gates the GitHub Pages deploy, and it is right to: a pack with no
 * learning path, a news page absent from the feed or a page missing from the
 * sitemap are all invisible-to-the-user content. But the content agents create
 * files and forget the index, over and over — that pattern froze the live site
 * from 2026-07-05 to 2026-08-10, and it came back within a day of being fixed.
 * The gaps are mechanical, so repairing them should be mechanical too.
 *
 *   node scripts/wire-content.mjs            # repair in place, report what changed
 *   node scripts/wire-content.mjs --check    # report only, exit 1 if repairs are needed
 *
 * It never invents facts. Titles, excerpts and dates are read from the page
 * that already exists; a generated brand page states only what `data/index.json`
 * and the question bank already assert (pack name, question count, difficulty,
 * topics) — never an exam price, length or pass mark.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = (p) => path.join(ROOT, p);
const read = (p) => readFileSync(r(p), "utf8");
const CHECK_ONLY = process.argv.includes("--check");
const changes = [];
const manual = [];

const dirsWithIndex = (base) =>
  existsSync(r(base))
    ? readdirSync(r(base)).filter((d) => existsSync(r(`${base}/${d}/index.html`)))
    : [];

const idx = JSON.parse(read("data/index.json"));
const availablePacks = idx.brands.flatMap((b) =>
  (b.packs || []).filter((p) => p.available !== false).map((p) => ({ ...p, brand: b })),
);

/* ---------- 1. packs without a learning path ---------- */
{
  const skipped = new Set(
    (JSON.parse(read("data/paths/_skipped.json")).reasons || []).map((x) => x.packId),
  );
  const havePath = new Set(
    readdirSync(r("data/paths"))
      .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
      .map((f) => f.replace(".json", "")),
  );
  const basename = (p) => p.file.replace("free/", "").replace(".json", "");
  const missing = availablePacks.filter(
    (p) => !havePath.has(basename(p)) && !skipped.has(basename(p)),
  );
  if (missing.length) {
    changes.push(`learning paths regenerated for ${missing.length} pack(s): ${missing.map((p) => p.id).join(", ")}`);
    if (!CHECK_ONLY) execFileSync("node", [r("scripts/gen-paths.js")], { stdio: "ignore" });
  }
}

/* ---------- 2. news pages absent from the feed ---------- */
// The feed entry is derived from the page itself, so the headline and date on
// the card are the ones the page publishes — no second source of truth.
const CATEGORIES = [
  [/\b(security|cybersecurity|soc|siem|pentest|ciss?p|threat)\b/i, ["security", "Security"]],
  [/\b(kubernetes|k8s|cka|ckad|cks)\b/i, ["kubernetes", "Kubernetes"]],
  [/\b(devops|terraform|ansible|vault|docker|ci\/cd|kafka|jenkins)\b/i, ["devops", "DevOps"]],
  [/\b(network|routing|switching|ccna|ccnp|encor)\b/i, ["networking", "Networking"]],
  [/\b(ai|machine learning|genai|llm)\b/i, ["ai", "AI & Machine Learning"]],
  [/\b(aws|azure|gcp|google cloud|cloud)\b/i, ["cloud", "Cloud"]],
];
{
  const feedPath = "data/news.json";
  const feed = JSON.parse(read(feedPath));
  const have = new Set(feed.articles.map((a) => a.url.replace(/^\/news\//, "").replace(/\/$/, "")));
  const missing = dirsWithIndex("news").filter((d) => !have.has(d));
  for (const slug of missing) {
    const html = read(`news/${slug}/index.html`);
    const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? slug)
      .replace(/\s*\|\s*CertQuests\s*$/i, "")
      .trim();
    const excerpt = (html.match(/<meta name="description" content="([^"]*)"/i)?.[1] ?? "").trim();
    const date =
      html.match(/"datePublished":\s*"(\d{4}-\d{2}-\d{2})/)?.[1] ??
      new Date().toISOString().slice(0, 10);
    const hay = `${title} ${excerpt}`;
    const [category, categoryLabel] =
      CATEGORIES.find(([re]) => re.test(hay))?.[1] ?? ["certs", "Certification Update"];
    const pack = availablePacks.find((p) => slug.includes(p.id))?.id;
    const entry = {
      id: slug,
      title,
      excerpt,
      category,
      categoryLabel,
      date,
      featured: false,
      url: `/news/${slug}/`,
      ...(pack ? { pack } : {}),
    };
    const at = feed.articles.findIndex((a) => a.date < date);
    feed.articles.splice(at === -1 ? feed.articles.length : at, 0, entry);
    changes.push(`news feed entry added: ${slug} (${category}, ${date})`);
  }
  if (missing.length && !CHECK_ONLY) {
    feed.lastUpdated = feed.articles.reduce((m, a) => (a.date > m ? a.date : m), feed.lastUpdated);
    writeFileSync(r(feedPath), JSON.stringify(feed, null, 2) + "\n");
  }
}

/* ---------- 3. brands with packs but no brand page ---------- */
const fit = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function brandPage(brand) {
  const packs = (brand.packs || []).filter((p) => p.available !== false);
  const first = packs[0];
  const topics = [...new Set(packs.flatMap((p) => p.tags || []))].filter((t) => t !== brand.id);
  const qs = packs.reduce((n, p) => n + (p.question_count || 0), 0);
  const shorts = packs.map((p) => p.short || p.id).join(", ");
  const title = fit(`${brand.name} Certification Practice Tests | CertQuests`, 60);
  const desc = fit(
    `Free ${brand.name} practice questions with explanations — ${shorts}. No signup, no paywall.`,
    160,
  );
  const packTiles = packs
    .map(
      (p) => `    <div class="pack-tile">
      <div class="pack-tile-name">${esc(p.name)}</div>
      <div class="pack-tile-meta">
        <span class="chip live">Live now</span>
        <span class="chip">${p.question_count} questions</span>
        <span class="chip">${esc(p.difficulty || "intermediate")}</span>
        <span class="chip">~${p.est_hours || 60}h study</span>
      </div>
      <div class="pack-cta-row"><button type="button" class="pack-cta pack-cta-primary" data-pack-picker
        data-pack="${p.id}"
        data-name="${esc(p.name)}"
        data-brand="${esc(brand.name)}"
        data-question-count="${p.question_count}"
        data-full-count="${p.full_count || p.question_count}">Start <span class="pack-cta-arrow">→</span></button><a href="/path.html?pack=${p.id}" class="pack-cta pack-cta-secondary">🗺️ Learning path</a></div>
    </div>`,
    )
    .join("\n");
  const courses = packs
    .map(
      (p, i) => `  {
    "@type": "ListItem",
    "position": ${i + 1},
    "item": {
      "@type": "Course",
      "name": ${JSON.stringify(p.name)},
      "description": ${JSON.stringify(`Free ${p.short || p.id} practice test with questions and explanations from CertQuests.`)},
      "provider": { "@type": "Organization", "name": "CertQuests", "sameAs": "https://certquests.com" },
      "hasCourseInstance": { "@type": "CourseInstance", "courseMode": "online", "courseWorkload": "PT${p.est_hours || 60}H" },
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    }
  }`,
    )
    .join(",\n");
  const topicList = topics.length
    ? `      <h3>What the questions cover</h3>\n      <ul>\n${topics.map((t) => `        <li>${esc(t.replace(/-/g, " "))}</li>`).join("\n")}\n      </ul>\n`
    : "";
  const related = idx.brands
    .filter((b) => b.id !== brand.id && (b.packs || []).some((p) => p.available !== false))
    .slice(0, 6)
    .map(
      (b) => `      <a href="${b.id}.html" class="related-card">
        <span class="related-dot" style="background:${b.color}"></span>
        ${esc(b.name)}
      </a>`,
    )
    .join("\n\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="icon" href="/favicon.ico?v=4" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/src/assets/icons/favicon-32.png?v=4" />
  <link rel="icon" type="image/png" sizes="192x192" href="/src/assets/icons/favicon-192.png?v=4" />
  <link rel="apple-touch-icon" sizes="180x180" href="/src/assets/icons/favicon-180.png?v=4" />
<meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />

  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="https://certquests.com/certifications/${brand.id}.html" />

  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://certquests.com/certifications/${brand.id}.html" />
  <meta property="og:title" content="${esc(fit(`${brand.name} Practice Tests — Free Online Quiz | CertQuests`, 70))}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="https://certquests.com/src/assets/og/og-default.png?v=1" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="CertQuests" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(fit(`${brand.name} Practice Tests — Free Online Quiz`, 70))}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="https://certquests.com/src/assets/og/og-default.png?v=1" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="/src/styles/main.css?v=135" />
  <link rel="stylesheet" href="/src/styles/desktop.css?v=135" />

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://certquests.com/" },
      { "@type": "ListItem", "position": 2, "name": "Certifications", "item": "https://certquests.com/#certifications" },
      { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(brand.name)}, "item": "https://certquests.com/certifications/${brand.id}.html" }
    ]
  }
  </script>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": ${JSON.stringify(`${brand.name} Certification Practice Tests`)},
    "itemListElement": [
${courses}
]
  }
  </script>

  <style>
    .brand-hero { max-width: 960px; margin: 0 auto; padding: 56px 24px 36px; text-align: center; position: relative; z-index: 2; }
    .brand-hero .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600; color: #4fc3f7; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; margin-bottom: 18px; }
    .brand-hero-icon { font-size: 40px; margin: 6px 0 10px; }
    .brand-hero h1 { font-size: clamp(28px, 5vw, 46px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; margin: 0 0 16px; color: #e8edf8; font-family: 'Space Grotesk', sans-serif; }
    .brand-hero h1 .accent { color: #4fc3f7; }
    .brand-hero p { font-size: clamp(14px, 2vw, 17px); color: #7c90ae; max-width: 620px; margin: 0 auto 24px; line-height: 1.6; }
    .brand-hero-cta { display: inline-flex; align-items: center; gap: 10px; background: ${brand.color}; color: #fff; padding: 16px 34px; border-radius: 14px; font-weight: 700; font-size: 15px; text-decoration: none; transition: transform 0.15s, filter 0.15s; box-shadow: 0 6px 22px rgba(0,0,0,0.3); }
    .brand-hero-cta:hover { transform: translateY(-1px); filter: brightness(1.08); }
    .brand-hero-stats { display: flex; justify-content: center; gap: clamp(20px, 5vw, 48px); flex-wrap: wrap; margin-top: 30px; }
    .brand-hero-stat strong { display: block; font-size: 26px; font-weight: 800; color: #4fc3f7; letter-spacing: -0.02em; }
    .brand-hero-stat span { font-size: 11px; text-transform: uppercase; color: #7c90ae; letter-spacing: 0.08em; }
    .brand-section { max-width: 960px; margin: 48px auto 0; padding: 0 24px; position: relative; z-index: 2; }
    .brand-section h2 { font-size: clamp(22px, 3.6vw, 30px); font-weight: 800; letter-spacing: -0.02em; color: #e8edf8; margin: 0 0 8px; font-family: 'Space Grotesk', sans-serif; }
    .brand-section .section-sub { font-size: 14px; color: #7c90ae; margin: 0 0 24px; }
    .pack-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .pack-tile { --pack-brand: ${brand.color}; background: #0c1120; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 22px 22px 18px; display: flex; flex-direction: column; gap: 10px; position: relative; overflow: hidden; }
    .pack-tile::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 4px; background: ${brand.color}; }
    .pack-tile-name { font-size: 15px; font-weight: 700; color: #e8edf8; letter-spacing: -0.01em; padding-left: 8px; }
    .pack-tile-meta { display: flex; flex-wrap: wrap; gap: 8px; padding-left: 8px; font-size: 11px; color: #7c90ae; }
    .pack-tile-meta .chip { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 3px 9px; border-radius: 20px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em; }
    .pack-tile-meta .chip.live { color: #10b981; border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.08); }
    .brand-prose { max-width: 760px; margin: 48px auto 0; padding: 0 24px; color: #9eb0cc; font-size: 15px; line-height: 1.75; position: relative; z-index: 2; }
    .brand-prose h3 { font-size: 18px; font-weight: 700; color: #e8edf8; margin: 28px 0 8px; letter-spacing: -0.01em; }
    .brand-prose ul { padding-left: 20px; margin: 8px 0 12px; }
    .brand-prose li { margin-bottom: 4px; }
    .related-brands { max-width: 960px; margin: 56px auto 0; padding: 0 24px; position: relative; z-index: 2; }
    .related-brands h2 { font-size: 14px; font-family: 'JetBrains Mono', monospace; color: #3d4f6a; text-transform: uppercase; letter-spacing: 0.12em; text-align: center; margin: 0 0 16px; font-weight: 600; }
    .related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .related-card { background: #0c1120; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px; text-decoration: none; text-align: center; color: #e8edf8; font-size: 13px; font-weight: 600; transition: border-color 0.2s, transform 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .related-card:hover { border-color: rgba(255,255,255,0.18); transform: translateY(-1px); }
    .related-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .bottom-cta { max-width: 760px; margin: 56px auto 0; padding: 32px 24px; text-align: center; background: linear-gradient(135deg, #0c1120 0%, #111d3a 100%); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; position: relative; z-index: 2; }
    .bottom-cta h2 { font-size: 22px; font-weight: 800; margin: 0 0 8px; color: #e8edf8; }
    .bottom-cta p { font-size: 14px; color: #7c90ae; margin: 0 0 18px; }
    .bottom-cta .brand-hero-cta { font-size: 14px; padding: 14px 28px; }
    .trademark-note { text-align: center; margin: 40px auto 24px; padding: 0 20px; font-size: 12px; color: #3d4f6a; max-width: 720px; line-height: 1.6; position: relative; z-index: 2; }
  </style>
  <link rel="manifest" href="/manifest.json" />
</head>
<body>
  <a href="#main-content" class="skip-to-main" style="position:absolute;left:-9999px;top:8px;z-index:9999;background:#3b82f6;color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;transition:left .1s" onfocus="this.style.left='16px'" onblur="this.style.left='-9999px'">Skip to main content</a>

  <header class="web-header">
    <a href="/" class="web-header-logo">
      <img src="/src/assets/icons/favicon-96.png?v=4" alt="CertQuests" class="web-header-bolt" width="32" height="32">
      CertQuests
    </a>
    <nav class="web-header-links" aria-label="Main navigation">
      <a href="/path.html" class="web-header-link-new">Cert Quest<span class="web-header-link-pill">NEW</span></a>
      <a href="/certifications/" aria-current="page">Certifications</a>
      <a href="/courses/">Courses</a>
      <a href="/careers/">Careers</a>
    </nav>
  </header>

  <main id="main-content">
  <section class="brand-hero">
    <span class="eyebrow">${esc(brand.name.toUpperCase())} · ${packs.length} LIVE EXAM${packs.length > 1 ? "S" : ""}</span>
    <div class="brand-hero-icon" aria-hidden="true">${brand.icon || "📘"}</div>
    <h1>Pass your <span class="accent">${esc(brand.name)}</span> exam</h1>
    <p>Free practice questions for ${esc(first?.name ?? brand.name)}, with an explanation on every answer. No signup, no paywall.</p>
    <a href="/train.html?brand=${brand.id}" class="brand-hero-cta">&#9889; Start training free</a>
    <div class="brand-hero-stats">
      <div class="brand-hero-stat"><strong>${qs}+</strong><span>Questions</span></div>
      <div class="brand-hero-stat"><strong>${packs.length}</strong><span>Live exams</span></div>
      <div class="brand-hero-stat"><strong>100%</strong><span>Free</span></div>
    </div>
  </section>

  <section class="brand-section">
    <h2>${esc(brand.name)} certifications covered</h2>
    <p class="section-sub">Click the exam to jump straight into a practice test or open its learning path.</p>
    <div class="pack-grid">
${packTiles}
    </div>
  </section>

  <div class="brand-prose">
      <h3>How these practice tests work</h3>
      <p>Every question is multiple choice with a written explanation, so a wrong answer teaches you something instead of just costing you a point. Progress and XP are saved in your browser; the learning path turns the same bank into chapters with drills, checkpoints and a final mock exam.</p>
      <p>Question counts grow over time — this page shows the live figure, not a target. For exam format, pricing and prerequisites, check ${esc(brand.name)}'s own certification pages: those change, and we would rather send you to the source than repeat a number that has gone stale.</p>
${topicList}  </div>

  <div class="bottom-cta">
    <h2>Ready to practice?</h2>
    <p>Jump into a practice test now — your progress and XP are saved locally.</p>
    <a href="/train.html?brand=${brand.id}" class="brand-hero-cta">Start training</a>
  </div>

  <section class="related-brands">
    <h2>Other vendors</h2>
    <div class="related-grid">

${related}
    </div>
  </section>

  <div class="trademark-note">
    CertQuests is an independent study tool and is not affiliated with or endorsed by ${esc(brand.name)}. All trademarks belong to their respective owners.
  </div>
  </main>

  <footer class="web-footer">
    <div class="web-footer-inner">
      <div class="web-footer-links">
        <a href="/">Home</a>
        <a href="/certifications/">Training</a>
        <a href="/courses/">Courses</a>
        <a href="/news/">News</a>
        <a href="/profile.html">My Profile</a>
        <a href="/contact.html">Contact</a>
        <a href="/privacy-policy.html">Privacy Policy</a>
        <a href="https://play.google.com/store/apps/details?id=com.certquest.app" target="_blank" rel="noopener">Android App</a>
      </div>
      <div class="web-footer-text">CertQuests &mdash; Free IT certification practice tests for ${esc(brand.name)} and more</div>
    </div>
  </footer>

    <script src="/src/pack-picker.js?v=135" defer></script>
<script src="/src/cq-core.js?v=135" defer></script>
  <script src="/src/mascot-loader.js?v=135" defer></script>
</body>
</html>
`;
}

{
  const hubPath = "certifications/index.html";
  let hub = read(hubPath);
  let hubChanged = false;
  for (const brand of idx.brands) {
    const packs = (brand.packs || []).filter((p) => p.available !== false);
    if (!packs.length) continue;
    const page = `certifications/${brand.id}.html`;
    if (!existsSync(r(page))) {
      changes.push(`brand page generated: ${page}`);
      manual.push(`${page} is generated from data/index.json — reread it and add vendor-specific copy when you can`);
      if (!CHECK_ONLY) writeFileSync(r(page), brandPage(brand));
    }
    if (!hub.includes(`/certifications/${brand.id}.html`)) {
      const card = `      <a class="cert-index-card" href="/certifications/${brand.id}.html" style="--brand-color:${brand.color}">
        <span class="cert-index-icon">${brand.icon || "📘"}</span>
        <div class="cert-index-brand">${esc(brand.name)}</div>
        <div class="cert-index-meta">${packs.length} exam${packs.length > 1 ? "s" : ""}</div>
        <p class="cert-index-desc">${esc(packs.map((p) => p.short || p.id).join(", "))}</p>
      </a>\n`;
      hub = hub.replace(/(\n    <\/div>\n\n    <div class="cert-index-cta-row">)/, `\n${card}$1`);
      hubChanged = true;
      changes.push(`hub card added for ${brand.id}`);
    }
  }
  if (hubChanged && !CHECK_ONLY) writeFileSync(r(hubPath), hub);
}

/* ---------- 4. pages absent from the sitemap ---------- */
{
  const sitemapPath = "sitemap.xml";
  let sitemap = read(sitemapPath);
  const SKIP = new Set(["node_modules", "test", "scripts", "src", "functions", ".git", "data", ".github"]);
  const missing = [];
  const walk = (dir) => {
    for (const e of readdirSync(r(dir), { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const rel = dir === "." ? e.name : `${dir}/${e.name}`;
      if (SKIP.has(e.name) || e.name.startsWith(".")) continue;
      if (existsSync(r(`${rel}/index.html`)) && !sitemap.includes(`/${rel}/`)) missing.push(rel);
      walk(rel);
    }
  };
  walk(".");
  // brand pages are files, not directories — the audit ignores them, but a page
  // nobody links and nobody lists is a page nobody reads.
  for (const brand of idx.brands) {
    const p = `certifications/${brand.id}.html`;
    if (existsSync(r(p)) && !sitemap.includes(`/${p}`)) missing.push(p);
  }
  const today = new Date().toISOString().slice(0, 10);
  const blocks = missing.map((rel) => {
    const html = existsSync(r(`${rel}/index.html`)) ? read(`${rel}/index.html`) : "";
    const lastmod = html.match(/"date(?:Published|Modified)":\s*"(\d{4}-\d{2}-\d{2})/)?.[1] ?? today;
    const priority = rel.startsWith("careers/") ? 0.85 : rel.startsWith("news/") ? 0.7 : 0.8;
    const loc = rel.endsWith(".html") ? `/${rel}` : `/${rel}/`;
    changes.push(`sitemap entry added: ${loc}`);
    return `  <url>\n    <loc>https://certquests.com${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
  });
  if (blocks.length && !CHECK_ONLY) {
    writeFileSync(r(sitemapPath), sitemap.replace("</urlset>", blocks.join("") + "</urlset>"));
  }
}

/* ---------- report ---------- */
if (!changes.length) {
  console.log("Wiring already complete — nothing to repair.");
  process.exit(0);
}
console.log(`${CHECK_ONLY ? "Wiring repairs needed" : "Wiring repaired"} (${changes.length}):`);
for (const c of changes) console.log(`  - ${c}`);
if (manual.length) {
  console.log("\nGenerated from data, worth a human pass:");
  for (const m of manual) console.log(`  - ${m}`);
}
process.exit(CHECK_ONLY ? 1 : 0);
