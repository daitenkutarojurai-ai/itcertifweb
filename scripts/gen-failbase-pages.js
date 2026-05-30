#!/usr/bin/env node
/**
 * scripts/gen-failbase-pages.js — Phase 6.12 (FailBase)
 *
 * Reads each `data/failbase/<slug>.json` and emits:
 *   - failbase/<slug>/index.html — business post-mortem page
 *   - failbase/index.html        — grid index
 *
 * Run: `node scripts/gen-failbase-pages.js`
 *   (or `npm run gen-failbase`). Idempotent.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'failbase');
const OUT_DIR  = path.join(ROOT, 'failbase');

const CACHE_BUST = 'v=106';

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
        <a href="/careers/">Careers</a>
        <a href="/contact.html">Contact</a>
        <a href="/privacy-policy.html">Privacy</a>
      </div>
      <div class="web-footer-text">CertQuests — Free IT certification training, courses, and career planning</div>
    </div>
  </footer>`;

const SHARED_STYLE = `<style>
.fb-page { max-width: 900px; margin: 0 auto; padding: 0 20px 80px; color: #e8edf8; }
.breadcrumb { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#506885; padding:14px 0 0; }
.breadcrumb a { color:#7c90ae; text-decoration:none; }
.breadcrumb a:hover { color:#e8edf8; }
.breadcrumb span { color:#7c90ae; margin:0 8px; }

.fb-hero { padding: 32px 8px 8px; }
.fb-hero .eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; padding:5px 14px; border-radius:999px; margin-bottom:14px; }
.fb-hero h1 { font-family:'Space Grotesk',sans-serif; font-size:clamp(28px,4.4vw,42px); font-weight:800; letter-spacing:-.02em; margin:0 0 8px; line-height:1.15; color:#f1f5fb; }
.fb-hero h1 .grad { background: linear-gradient(135deg,#f87171 0%, #c084fc 60%, #60a5fa 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; }
.fb-hero .lede { font-size:15.5px; line-height:1.65; color:#a8b6d1; max-width:760px; margin:0; }

.fb-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin: 22px 0 0; }
.fb-stat { padding: 14px 16px; background: rgba(0,0,0,.3); border: 1px solid rgba(255,255,255,.07); border-left: 3px solid var(--fb-color, #f87171); border-radius: 10px; }
.fb-stat-label { font-family:'JetBrains Mono',monospace; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--fb-color, #f87171); margin-bottom: 4px; }
.fb-stat-value { font-family:'Space Grotesk',sans-serif; font-weight: 700; color: #f1f5fb; font-size: 15px; line-height: 1.4; }

.fb-meta { display:flex; flex-wrap:wrap; gap:8px; margin: 14px 0 0; font-size:12px; color:#7c90ae; font-family:'JetBrains Mono',monospace; }
.fb-meta .pill { padding:4px 10px; border-radius:999px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); }

.fb-section { margin: 28px 0 0; padding: 22px 22px 18px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06); border-radius:14px; }
.fb-section h2 { font-family:'Space Grotesk',sans-serif; font-size:19px; font-weight:700; margin:0 0 14px; color:#f1f5fb; letter-spacing:-.015em; display:flex; align-items:center; gap:8px; }

/* Timeline */
.fb-timeline { position: relative; padding-left: 28px; margin: 0; list-style: none; }
.fb-timeline::before { content: ''; position: absolute; left: 8px; top: 6px; bottom: 6px; width: 2px; background: linear-gradient(to bottom, var(--fb-color, #f87171), rgba(124,144,174,.3)); }
.fb-timeline li { position: relative; padding-bottom: 14px; }
.fb-timeline li::before { content: ''; position: absolute; left: -28px; top: 5px; width: 14px; height: 14px; border-radius: 50%; background: var(--fb-color, #f87171); border: 3px solid #06080f; box-shadow: 0 0 0 1px rgba(255,255,255,.08); }
.fb-timeline .tl-date { font-family:'JetBrains Mono',monospace; font-size: 11px; color: var(--fb-color, #f87171); font-weight: 700; letter-spacing: .08em; }
.fb-timeline .tl-event { color: #cbd5e1; font-size: 13.5px; line-height: 1.55; margin-top: 2px; }

/* Mistakes (similar to fail-analysis but for business failures) */
.fb-mistake { padding: 18px 18px 16px; background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.07); border-left: 4px solid var(--fb-color, #f87171); border-radius: 12px; margin-bottom: 14px; }
.fb-mistake-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; }
.fb-mistake-rank { font-family:'Space Grotesk',sans-serif; font-weight: 800; font-size: 32px; color: var(--fb-color, #f87171); line-height: 1; min-width: 38px; }
.fb-mistake-title { font-family:'Space Grotesk',sans-serif; font-size: 16px; font-weight: 700; color: #f1f5fb; line-height: 1.3; }
.fb-mistake-why { color: #cbd5e1; font-size: 13.5px; line-height: 1.65; margin: 0 0 10px; }
.fb-mistake-evidence { padding: 10px 14px; background: rgba(0,0,0,.3); border: 1px solid rgba(255,255,255,.05); border-radius: 8px; color: #a8b6d1; font-size: 12.5px; line-height: 1.6; }
.fb-mistake-evidence strong { font-family:'JetBrains Mono',monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #fbbf24; display: block; margin-bottom: 4px; }
.fb-mistake-source { margin-top: 8px; font-size: 11.5px; font-family:'JetBrains Mono',monospace; }
.fb-mistake-source a { color: #60a5fa; text-decoration: none; }
.fb-mistake-source a:hover { text-decoration: underline; }

.fb-after { padding: 16px 18px; background: rgba(96,165,250,.06); border: 1px solid rgba(96,165,250,.22); border-radius: 12px; color: #c7d8f7; font-size: 14px; line-height: 1.7; }
.fb-after strong { color: #60a5fa; font-family:'JetBrains Mono',monospace; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; display: block; margin-bottom: 6px; }

.fb-lesson { padding: 18px 20px; background: linear-gradient(180deg, rgba(192,132,252,.10), rgba(192,132,252,.03)); border: 1px solid rgba(192,132,252,.32); border-radius: 12px; color: #e8d9ff; font-size: 14.5px; line-height: 1.65; }
.fb-lesson strong { color: #c084fc; font-family:'JetBrains Mono',monospace; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; display: block; margin-bottom: 6px; }

.fb-sources { margin-top: 18px; padding: 14px 16px; background:rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.05); border-radius:10px; }
.fb-sources h3 { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#7c90ae; margin:0 0 6px; }
.fb-sources ul { margin:0; padding-left:18px; color:#a8b6d1; font-size:12.5px; line-height:1.65; }
.fb-sources a { color:#60a5fa; text-decoration:none; }
.fb-sources a:hover { text-decoration:underline; }
.fb-sources .disclaimer { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.05); font-size: 11px; color:#506885; line-height: 1.55; }
</style>`;

function freshnessClass(lastReviewed) {
  try {
    const [y, m] = lastReviewed.split('-').map(Number);
    const reviewed = new Date(y, m - 1, 1);
    const now = new Date();
    const months = (now.getFullYear() - reviewed.getFullYear()) * 12 + (now.getMonth() - reviewed.getMonth());
    if (months <= 6) return { cls: 'fresh', label: 'Révisé ' + lastReviewed };
    if (months <= 18) return { cls: 'warn',  label: 'Révisé ' + lastReviewed };
    return                       { cls: 'stale', label: '⚠ Vieux (' + lastReviewed + ')' };
  } catch (_) {
    return { cls: 'warn', label: lastReviewed || '—' };
  }
}

function pageJsonLd(d) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': d.title,
    'description': d.tldr,
    'datePublished': d.lastReviewed + '-01',
    'dateModified':  d.lastReviewed + '-01',
    'url': `https://certquests.com/failbase/${d.slug}/`,
    'about': { '@type': 'Thing', 'name': d.company }
  };
}

function renderTimeline(timeline) {
  return (timeline || []).map(e =>
    `<li>
      <div class="tl-date">${esc(e.date)}</div>
      <div class="tl-event">${esc(e.event)}</div>
    </li>`
  ).join('');
}

function renderMistake(m) {
  const src = m.source
    ? `<div class="fb-mistake-source">📌 <a href="${esc(m.source.url)}" target="_blank" rel="noopener nofollow">${esc(m.source.label)}</a></div>`
    : '';
  return `<div class="fb-mistake">
    <div class="fb-mistake-head">
      <div class="fb-mistake-rank">#${m.rank}</div>
      <div class="fb-mistake-title">${esc(m.mistake)}</div>
    </div>
    <p class="fb-mistake-why">${esc(m.why)}</p>
    <div class="fb-mistake-evidence">
      <strong>Évidence</strong>
      ${esc(m.evidence)}
      ${src}
    </div>
  </div>`;
}

function renderPage(d) {
  const ld = pageJsonLd(d);
  const fresh = freshnessClass(d.lastReviewed);
  const timelineHtml = renderTimeline(d.timeline);
  const mistakesHtml = (d.mistakes || []).map(renderMistake).join('');
  const sourcesHtml = (d.sources || []).map(s =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>${esc(d.metaTitle || (d.title + ' — FailBase · CertQuests'))}</title>
  <meta name="description" content="${esc(d.metaDescription || d.tldr)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="https://certquests.com/failbase/${esc(d.slug)}/" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://certquests.com/failbase/${esc(d.slug)}/" />
  <meta property="og:title" content="${esc(d.title)}" />
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

<main class="fb-page" id="main-content" style="--fb-color:${esc(d.color)}">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span><a href="/failbase/">FailBase</a><span>/</span>${esc(d.company)}
  </nav>

  <section class="fb-hero">
    <span class="eyebrow" style="color:${esc(d.color)};background:${esc(d.color)}1a;border:1px solid ${esc(d.color)}55">${esc(d.icon)} FailBase</span>
    <h1>${esc(d.title)}</h1>
    <p class="lede">${esc(d.tldr)}</p>
    <div class="fb-stats">
      <div class="fb-stat"><div class="fb-stat-label">Vécu</div><div class="fb-stat-value">${esc(d.lived)}</div></div>
      <div class="fb-stat"><div class="fb-stat-label">Coût total</div><div class="fb-stat-value">${esc(d.totalLoss)}</div></div>
      <div class="fb-stat"><div class="fb-stat-label">Personnage clé</div><div class="fb-stat-value">${esc(d.founders)}</div></div>
    </div>
    <div class="fb-meta">
      <span class="pill">${esc(fresh.label)}</span>
      <span class="pill">${(d.mistakes || []).length} erreurs analysées</span>
      <span class="pill">${(d.sources || []).length} sources</span>
    </div>
  </section>

  <section class="fb-section">
    <h2>🕰️ Timeline</h2>
    <ol class="fb-timeline">${timelineHtml}</ol>
  </section>

  <section class="fb-section">
    <h2>💀 Les ${(d.mistakes || []).length} erreurs fatales</h2>
    ${mistakesHtml}
  </section>

  <section class="fb-section">
    <h2>📜 Ce qui s'est passé après</h2>
    <div class="fb-after"><strong>Suite & héritage</strong>${esc(d.afterStory)}</div>
  </section>

  <section class="fb-section">
    <h2>🎯 La leçon</h2>
    <div class="fb-lesson"><strong>Pour ton prochain projet</strong>${esc(d.lessonForUs)}</div>
  </section>

  <div class="fb-sources">
    <h3>Sources</h3>
    <ul>${sourcesHtml}</ul>
    <p class="disclaimer">${esc(d.disclaimer)}</p>
  </div>
</main>

${FOOTER}

<script src="/src/cq-core.js?${CACHE_BUST}" defer></script>
<script src="/src/mascot-loader.js?${CACHE_BUST}" defer></script>
</body>
</html>
`;
}

function renderIndex(datasets) {
  const allTags = Array.from(new Set(datasets.flatMap(d => d.tags || []))).sort();
  const tagFilters = allTags.map(t =>
    `<button type="button" class="fb-tag-filter" data-tag="${esc(t)}">#${esc(t)}</button>`
  ).join('');

  const cards = datasets.map(d => {
    const tagList = (d.tags || []).join(' ');
    return `<a class="fb-card" href="/failbase/${esc(d.slug)}/" data-tags="${esc(tagList)}" style="--fb-color:${esc(d.color)}">
      <div class="fb-card-head">
        <span class="fb-card-icon">${esc(d.icon)}</span>
        <span class="fb-card-lived">${esc(d.lived)}</span>
      </div>
      <div class="fb-card-title">${esc(d.title)}</div>
      <div class="fb-card-tldr">${esc(d.tldr)}</div>
      <div class="fb-card-loss">${esc(d.totalLoss)}</div>
      <div class="fb-card-meta">${(d.mistakes || []).length} erreurs · Révisé ${esc(d.lastReviewed)}</div>
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>FailBase — Post-mortems business des grandes faillites tech · CertQuests</title>
  <meta name="description" content="Pourquoi Quibi, Nokia, le metaverse Meta, WeWork ont échoué. Post-mortems sourcés sur SEC filings, articles WSJ/NYT, verdicts judiciaires. Pas de gossip, que du document public." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://certquests.com/failbase/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://certquests.com/failbase/" />
  <meta property="og:title" content="FailBase — Post-mortems business des grandes faillites tech" />
  <meta property="og:description" content="Pourquoi Quibi, Nokia, le metaverse, WeWork — sources publiques uniquement." />
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
  ${SHARED_STYLE}
  <style>
    .fb-filters { display:flex; flex-wrap:wrap; gap:6px; margin: 18px 0 0; }
    .fb-tag-filter { font-family:'JetBrains Mono',monospace; font-size: 11px; padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); color: #a8b6d1; cursor: pointer; min-height: 32px; }
    .fb-tag-filter:hover { background: rgba(248,113,113,.10); border-color: rgba(248,113,113,.32); color: #f87171; }
    .fb-tag-filter.is-active { background: rgba(248,113,113,.18); border-color: rgba(248,113,113,.5); color: #fecaca; }

    .fb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 14px; margin-top: 18px; }
    .fb-card { display: flex; flex-direction: column; gap: 8px; padding: 18px; background: linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.005)); border: 1px solid rgba(255,255,255,.07); border-left: 3px solid var(--fb-color, #f87171); border-radius: 14px; text-decoration: none; color: inherit; transition: transform .18s, border-color .18s, box-shadow .18s; }
    .fb-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.18); box-shadow: 0 14px 30px -16px rgba(0,0,0,.6); }
    .fb-card[hidden] { display: none !important; }
    .fb-card-head { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
    .fb-card-icon { font-size: 26px; }
    .fb-card-lived { font-family:'JetBrains Mono',monospace; font-size: 10px; letter-spacing: .1em; color: #7c90ae; text-align: right; }
    .fb-card-title { font-family:'Space Grotesk',sans-serif; font-weight: 800; font-size: 16px; color: #f1f5fb; line-height: 1.3; }
    .fb-card-tldr { font-size: 13px; color: #a8b6d1; line-height: 1.55; }
    .fb-card-loss { font-family:'JetBrains Mono',monospace; font-size: 11.5px; color: var(--fb-color, #f87171); padding: 4px 9px; background: rgba(255,255,255,.03); border-radius: 6px; align-self: flex-start; }
    .fb-card-meta { font-family:'JetBrains Mono',monospace; font-size: 10.5px; color: #506885; margin-top: auto; padding-top: 6px; }
  </style>
</head>
<body>
${HEADER}

<main class="fb-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span>FailBase
  </nav>

  <section class="fb-hero">
    <span class="eyebrow" style="color:#f87171;background:rgba(248,113,113,.10);border:1px solid rgba(248,113,113,.32)">💀 FailBase</span>
    <h1>Post-mortems <span class="grad">business</span></h1>
    <p class="lede">Pourquoi des entreprises avec un milliard $ levés ont coulé. Chaque post-mortem s'appuie uniquement sur des SEC filings, articles WSJ/NYT, verdicts judiciaires — jamais sur du gossip. Le but : comprendre les patterns de décision qui tuent une boîte avant qu'elle ait fini de scaler.</p>
    <div class="fb-filters" role="group" aria-label="Filter by tag">
      <button type="button" class="fb-tag-filter is-active" data-tag="">Tous</button>
      ${tagFilters}
    </div>
  </section>

  <section>
    <div class="fb-grid" id="fb-grid">${cards}</div>
  </section>
</main>

${FOOTER}

<script>
(function () {
  var filters = document.querySelectorAll('.fb-tag-filter');
  var cards = document.querySelectorAll('.fb-card');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var tag = btn.getAttribute('data-tag');
      cards.forEach(function (card) {
        if (!tag) { card.hidden = false; return; }
        var tags = (card.getAttribute('data-tags') || '').split(/\\s+/);
        card.hidden = tags.indexOf(tag) === -1;
      });
    });
  });
})();
</script>

<script src="/src/cq-core.js?${CACHE_BUST}" defer></script>
<script src="/src/mascot-loader.js?${CACHE_BUST}" defer></script>
</body>
</html>
`;
}

function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error('No data/failbase directory found.');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).sort();
  const datasets = files.map(f => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')));

  let written = 0;
  for (const d of datasets) {
    const dir = path.join(OUT_DIR, d.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPage(d), 'utf8');
    console.log('wrote', path.relative(ROOT, path.join(dir, 'index.html')));
    written++;
  }
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderIndex(datasets), 'utf8');
  console.log('wrote', path.relative(ROOT, path.join(OUT_DIR, 'index.html')));
  console.log(`gen-failbase: ${written} pages + 1 index`);
}

main();
