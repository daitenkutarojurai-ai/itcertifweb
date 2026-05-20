#!/usr/bin/env node
/**
 * scripts/gen-failanalysis-pages.js — Phase 6.3.
 *
 * Reads each `data/fail-analysis/<cert>.json` and renders one viral
 * "why people fail this cert" page per dataset under
 * `fail-analysis/<cert>/index.html`. Also rebuilds the index at
 * `fail-analysis/index.html`.
 *
 * Run: `node scripts/gen-failanalysis-pages.js` (or `npm run gen-failanalysis`).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'fail-analysis');
const OUT_DIR  = path.join(ROOT, 'fail-analysis');

const CACHE_BUST = 'v=98';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const HEADER = `  <header class="web-header">
    <a href="/" class="web-header-logo">
      <img src="/src/assets/icons/favicon-96.png?v=4" alt="CertQuests" class="web-header-bolt" width="32" height="32">
      CertQuests
    </a>
    <nav class="web-header-links" aria-label="Main navigation">
      <a href="/path.html" class="web-header-link-new">Cert Quest<span class="web-header-link-pill">NEW</span></a>
      <a href="/certifications/">Certifications</a>
      <a href="/courses/">Courses</a>
      <a href="/careers/">Careers</a>
    </nav>
  </header>`;

const FOOTER = `  <footer class="web-footer">
    <div class="web-footer-inner">
      <div class="web-footer-links">
        <a href="/">Home</a>
        <a href="/certifications/">Certifications</a>
        <a href="/courses/">Courses</a>
        <a href="/news/">News</a>
        <a href="/contact.html">Contact</a>
        <a href="/privacy-policy.html">Privacy</a>
      </div>
      <div class="web-footer-text">CertQuests — Free IT certification training, courses, and post-mortems</div>
    </div>
  </footer>`;

const SHARED_STYLE = `<style>
.fa-page { max-width: 880px; margin: 0 auto; padding: 0 20px 80px; color: #e8edf8; }
.breadcrumb { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#506885; padding:14px 0 0; }
.breadcrumb a { color:#7c90ae; text-decoration:none; }
.breadcrumb a:hover { color:#e8edf8; }
.breadcrumb span { color:#7c90ae; margin:0 8px; }

.fa-hero { padding: 32px 8px 8px; }
.fa-hero .eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#f87171; background:rgba(248,113,113,.10); border:1px solid rgba(248,113,113,.32); padding:5px 14px; border-radius:999px; margin-bottom:14px; }
.fa-hero h1 { font-family:'Space Grotesk',sans-serif; font-size:clamp(28px,4.4vw,42px); font-weight:800; letter-spacing:-.02em; margin:0 0 8px; line-height:1.15; color:#f1f5fb; }
.fa-hero h1 .grad { background: linear-gradient(135deg,#f87171 0%, #fb923c 60%, #fbbf24 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; }
.fa-hero .lede { font-size:16px; line-height:1.6; color:#a8b6d1; max-width:760px; margin:0; }
.fa-meta { display:flex; flex-wrap:wrap; gap:10px; margin: 14px 0 4px; font-size:12px; color:#7c90ae; font-family:'JetBrains Mono',monospace; }
.fa-meta .pill { padding:4px 10px; border-radius:999px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); }
.fa-meta .pill.fresh { color:#6ee7b7; border-color:rgba(52,211,153,.3); background:rgba(52,211,153,.08); }
.fa-meta .pill.warn { color:#fbbf24; border-color:rgba(251,191,36,.3); background:rgba(251,191,36,.08); }

.fa-tldr { margin: 24px 0 0; padding: 16px 18px; background:rgba(248,113,113,.10); border:1px solid rgba(248,113,113,.32); border-radius:12px; color:#e8edf8; font-size:15.5px; line-height:1.55; }
.fa-tldr strong { color:#f87171; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; display:block; margin-bottom:4px; }

.fa-section { margin: 32px 0 0; padding: 22px 22px 18px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06); border-radius:14px; }
.fa-section h2 { font-family:'Space Grotesk',sans-serif; font-size:20px; font-weight:700; margin:0 0 14px; color:#f1f5fb; letter-spacing:-.015em; }
.fa-section p { color:#a8b6d1; font-size:14.5px; line-height:1.65; margin: 0 0 10px; }

.mistake { padding: 18px 18px 16px; background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.07); border-left: 4px solid var(--fa-color, #f87171); border-radius: 12px; margin-bottom: 14px; }
.mistake-head { display:flex; align-items:baseline; gap:12px; margin-bottom:8px; }
.mistake-rank { font-family:'Space Grotesk',sans-serif; font-weight:800; font-size:32px; color: var(--fa-color, #f87171); line-height:1; min-width:38px; }
.mistake-title { font-family:'Space Grotesk',sans-serif; font-size:17px; font-weight:700; color:#f1f5fb; line-height:1.3; }
.mistake-frequency { display:inline-block; font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:.08em; color:#fbbf24; background:rgba(251,191,36,.08); border:1px solid rgba(251,191,36,.2); padding:3px 9px; border-radius:999px; margin: 4px 0 12px; }
.mistake-why  { color:#cbd5e1; font-size:14px; line-height:1.6; margin:0 0 10px; }
.mistake-fix  { padding:12px 14px; background:rgba(52,211,153,.07); border:1px solid rgba(52,211,153,.22); border-radius:10px; color:#d1fae5; font-size:13.5px; line-height:1.6; }
.mistake-fix strong { color:#34d399; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.12em; text-transform:uppercase; display:block; margin-bottom:4px; }
.mistake-fix code { background: rgba(0,0,0,.4); padding: 1px 6px; border-radius: 4px; font-size: 12px; color: #fbbf24; }

.cta-row { display:flex; flex-wrap:wrap; gap:10px; margin-top: 18px; }
.cta-row a { padding:11px 18px; border-radius:12px; font-family:'Space Grotesk',sans-serif; font-size:14px; font-weight:700; text-decoration:none; transition:transform .15s, filter .15s; }
.cta-row a.primary { background: var(--fa-color, #f87171); color:#0a0f1d; }
.cta-row a.primary:hover { transform:translateY(-1px); filter:brightness(1.05); }
.cta-row a.secondary { background:rgba(255,255,255,.04); color:#e8edf8; border:1px solid rgba(255,255,255,.12); }
.cta-row a.secondary:hover { background:rgba(255,255,255,.08); }

.sources { margin-top:24px; padding:12px 16px; background:rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.05); border-radius:10px; }
.sources h3 { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#7c90ae; margin:0 0 6px; }
.sources ul { margin:0; padding-left:18px; color:#a8b6d1; font-size:12.5px; line-height:1.6; }
.sources a { color:#60a5fa; text-decoration:none; }
.sources a:hover { text-decoration:underline; }
.sources .disclaimer { margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,.05); font-size:11px; color:#506885; line-height:1.5; }
</style>`;

function jsonLd(d) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': `Pourquoi les gens ratent ${d.certTitle}`,
    'description': d.intro.slice(0, 200),
    'datePublished': d.lastReviewed + '-01',
    'dateModified': d.lastReviewed + '-01',
    'url': `https://certquests.com/fail-analysis/${d.cert}/`
  };
}

function renderPage(d) {
  const ld = jsonLd(d);
  const trainPack = d.trainPackId || d.cert;

  const mistakesHtml = d.mistakes.map(m => `<div class="mistake" style="--fa-color:${esc(d.color)}">
    <div class="mistake-head">
      <div class="mistake-rank">#${m.rank}</div>
      <div class="mistake-title">${esc(m.mistake)}</div>
    </div>
    <div class="mistake-frequency">${esc(m.frequency)}</div>
    <p class="mistake-why">${esc(m.why)}</p>
    <div class="mistake-fix"><strong>Le fix</strong>${esc(m.fix)}</div>
  </div>`).join('');

  const sourcesHtml = d.sources.map(s =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>Pourquoi les gens ratent ${esc(d.certTitle)} — Top 5 erreurs · CertQuests</title>
  <meta name="description" content="Top 5 erreurs qui font rater l'examen ${esc(d.certTitle)}. Données issues de r/${esc(d.cert)} et forums communautaires. Conseils correctifs concrets — révisé ${esc(d.lastReviewed)}." />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="https://certquests.com/fail-analysis/${esc(d.cert)}/" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://certquests.com/fail-analysis/${esc(d.cert)}/" />
  <meta property="og:title" content="Pourquoi les gens ratent ${esc(d.certTitle)}" />
  <meta property="og:description" content="${esc(d.tldr)}" />
  <meta property="og:image" content="https://certquests.com/src/assets/og/og-default.png?v=1" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" href="/favicon.ico?v=4" sizes="any" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/src/styles/main.css?${CACHE_BUST}" />
  <link rel="stylesheet" href="/src/styles/desktop.css?${CACHE_BUST}" />
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  ${SHARED_STYLE}
</head>
<body>
${HEADER}

<main class="fa-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span><a href="/fail-analysis/">Fail Analysis</a><span>/</span>${esc(d.certTitle)}
  </nav>

  <section class="fa-hero">
    <span class="eyebrow">⚠️ Fail Analysis</span>
    <h1>Pourquoi les gens <span class="grad">ratent ${esc(d.certTitle)}</span></h1>
    <p class="lede">${esc(d.intro)}</p>
    <div class="fa-meta">
      <span class="pill fresh">Révisé ${esc(d.lastReviewed)}</span>
      <span class="pill warn">${esc(d.passRateNote)}</span>
    </div>
  </section>

  <div class="fa-tldr"><strong>TL;DR</strong>${esc(d.tldr)}</div>

  <section class="fa-section">
    <h2>Top 5 erreurs (du plus fréquent au moins fréquent)</h2>
    ${mistakesHtml}
  </section>

  <section class="fa-section">
    <h2>Évite ces 5 erreurs en t'entraînant correctement</h2>
    <p>La pratique sur des questions au format examen reste la méthode #1 pour calibrer son niveau. ${esc(d.certTitle)} a sa propre banque sur CertQuests — gratuite et sans inscription.</p>
    <div class="cta-row">
      <a class="primary" href="/train.html?pack=${esc(trainPack)}" style="background:${esc(d.color)};color:#fff">⚡ S'entraîner sur ${esc(d.examCode)}</a>
      <a class="secondary" href="/path.html?pack=${esc(trainPack)}">🗺️ Cert Quest path</a>
    </div>
  </section>

  <div class="sources">
    <h3>Sources</h3>
    <ul>${sourcesHtml}</ul>
    <p class="disclaimer">Analyse issue de threads publics (Reddit, communautés Discord/forum vendor). Les fréquences sont des estimations qualitatives — pas des stats officielles. Vérifier avec ses propres recherches avant de prendre une décision majeure de prep.</p>
  </div>
</main>

${FOOTER}

<script src="/src/cq-core.js?${CACHE_BUST}" defer></script>
<script src="/src/mascot-loader.js?${CACHE_BUST}" defer></script>
</body>
</html>
`;
}

function renderIndex(items) {
  const cards = items.map(d => `<a class="fa-card" href="/fail-analysis/${esc(d.cert)}/">
    <div class="fa-card-rank">⚠️ TOP 5 ERREURS</div>
    <div class="fa-card-title">${esc(d.certTitle)}</div>
    <div class="fa-card-tldr">${esc(d.tldr)}</div>
    <div class="fa-card-meta">Révisé ${esc(d.lastReviewed)}</div>
  </a>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>Pourquoi les gens ratent leurs certifs IT — analyses · CertQuests</title>
  <meta name="description" content="Post-mortems des examens cert IT : top 5 erreurs récurrentes par cert, sources communautaires, conseils correctifs concrets. CCNA, AWS SAA, RHCSA et plus." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://certquests.com/fail-analysis/" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" href="/favicon.ico?v=4" sizes="any" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/src/styles/main.css?${CACHE_BUST}" />
  <link rel="stylesheet" href="/src/styles/desktop.css?${CACHE_BUST}" />
  ${SHARED_STYLE}
  <style>
    .fa-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:14px; margin-top:18px; }
    .fa-card { display:flex; flex-direction:column; gap:8px; padding:18px; background:linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.005)); border:1px solid rgba(255,255,255,.07); border-left:3px solid #f87171; border-radius:14px; text-decoration:none; color:inherit; transition:transform .18s, border-color .18s, box-shadow .18s; }
    .fa-card:hover { transform:translateY(-2px); border-color:rgba(255,255,255,.18); box-shadow:0 14px 30px -16px rgba(0,0,0,.6); }
    .fa-card-rank { font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:.14em; color:#f87171; }
    .fa-card-title { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:16px; color:#f1f5fb; line-height:1.25; }
    .fa-card-tldr { font-size:13px; color:#a8b6d1; line-height:1.5; margin-top:4px; }
    .fa-card-meta { font-family:'JetBrains Mono',monospace; font-size:10.5px; color:#506885; margin-top:auto; padding-top:6px; }
  </style>
</head>
<body>
${HEADER}

<main class="fa-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span>Fail Analysis
  </nav>
  <section class="fa-hero">
    <span class="eyebrow">⚠️ Fail Analysis</span>
    <h1>Pourquoi les gens <span class="grad">ratent</span></h1>
    <p class="lede">Post-mortems des examens cert IT. Top 5 erreurs récurrentes par cert, sources communautaires (Reddit, forums vendor), conseils correctifs concrets.</p>
  </section>

  <section class="fa-section">
    <h2>Analyses disponibles</h2>
    <div class="fa-grid">${cards}</div>
  </section>
</main>

${FOOTER}

<script src="/src/cq-core.js?${CACHE_BUST}" defer></script>
<script src="/src/mascot-loader.js?${CACHE_BUST}" defer></script>
</body>
</html>
`;
}

function main() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).sort();
  const datasets = files.map(f => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')));

  let written = 0;
  for (const d of datasets) {
    const dir = path.join(OUT_DIR, d.cert);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPage(d), 'utf8');
    written++;
    console.log('wrote', path.relative(ROOT, path.join(dir, 'index.html')));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderIndex(datasets), 'utf8');
  console.log('wrote', path.relative(ROOT, path.join(OUT_DIR, 'index.html')));
  console.log(`gen-failanalysis: ${written} pages + 1 index`);
}

main();
