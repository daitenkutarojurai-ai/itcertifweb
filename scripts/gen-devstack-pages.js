#!/usr/bin/env node
/**
 * scripts/gen-devstack-pages.js — Phase 6.9 (DevStack)
 *
 * Reads each `data/devstack/<slug>.json` and emits:
 *   - devstack/<slug>/index.html — per-company tech stack page
 *   - devstack/index.html        — grid index
 *
 * Run: `node scripts/gen-devstack-pages.js`
 *   (or `npm run gen-devstack`). Idempotent.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'devstack');
const OUT_DIR  = path.join(ROOT, 'devstack');

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
        <a href="/careers/">Careers</a>
        <a href="/contact.html">Contact</a>
        <a href="/privacy-policy.html">Privacy</a>
      </div>
      <div class="web-footer-text">CertQuests — Free IT certification training, courses, and career planning</div>
    </div>
  </footer>`;

const SOURCE_TYPE_ICON = { blog: '📝', talk: '🎤', job: '💼', github: '🐙', other: '🔗' };
const STATUS_LABEL = {
  'current':        { label: 'actuel',                cls: 'st-current' },
  'migrating-from': { label: 'migration sortante',    cls: 'st-from' },
  'migrated-to':    { label: 'migration entrante',    cls: 'st-to' },
  'retired':        { label: 'retiré',                cls: 'st-retired' }
};

const SHARED_STYLE = `<style>
.ds-page { max-width: 1000px; margin: 0 auto; padding: 0 20px 80px; color: #e8edf8; }
.breadcrumb { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#506885; padding:14px 0 0; }
.breadcrumb a { color:#7c90ae; text-decoration:none; }
.breadcrumb a:hover { color:#e8edf8; }
.breadcrumb span { color:#7c90ae; margin:0 8px; }

.ds-hero { padding: 32px 8px 8px; }
.ds-hero .eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; padding:5px 14px; border-radius:999px; margin-bottom:14px; }
.ds-hero h1 { font-family:'Space Grotesk',sans-serif; font-size:clamp(28px,4.4vw,42px); font-weight:800; letter-spacing:-.02em; margin:0 0 8px; line-height:1.15; color:#f1f5fb; }
.ds-hero .lede { font-size:15.5px; line-height:1.6; color:#a8b6d1; max-width:760px; margin:0; }
.ds-meta { display:flex; flex-wrap:wrap; gap:8px; margin: 14px 0 4px; font-size:12px; color:#7c90ae; font-family:'JetBrains Mono',monospace; }
.ds-meta .pill { padding:4px 10px; border-radius:999px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); }
.ds-meta .pill.fresh { color:#6ee7b7; border-color:rgba(52,211,153,.3); background:rgba(52,211,153,.08); }
.ds-meta .pill.warn  { color:#fbbf24; border-color:rgba(251,191,36,.3); background:rgba(251,191,36,.08); }
.ds-meta .pill.stale { color:#f87171; border-color:rgba(248,113,113,.3); background:rgba(248,113,113,.08); }

.ds-scale { margin: 22px 0 0; padding: 14px 18px; background: rgba(255,255,255,.04); border-left: 3px solid var(--ds-color, #60a5fa); border-radius: 10px; color: #cbd5e1; font-size: 14px; line-height: 1.6; }
.ds-scale strong { color: var(--ds-color, #60a5fa); font-family:'JetBrains Mono',monospace; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; display: block; margin-bottom: 3px; }

.ds-section { margin: 26px 0 0; padding: 22px 22px 18px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06); border-radius:14px; }
.ds-section h2 { font-family:'Space Grotesk',sans-serif; font-size:19px; font-weight:700; margin:0 0 14px; color:#f1f5fb; letter-spacing:-.015em; display: flex; align-items: center; gap: 8px; }

/* Stack category */
.ds-category { margin-bottom: 16px; }
.ds-category-name { font-family:'JetBrains Mono',monospace; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--ds-color, #60a5fa); margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px dashed rgba(255,255,255,.08); }
.ds-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
.ds-item { padding: 12px 14px; background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.06); border-radius: 10px; }
.ds-item-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.ds-item-name { font-family:'Space Grotesk',sans-serif; font-weight: 700; color: #f1f5fb; font-size: 14px; }
.ds-item-status { font-family:'JetBrains Mono',monospace; font-size: 9.5px; padding: 2px 7px; border-radius: 999px; letter-spacing: .08em; text-transform: uppercase; }
.ds-item-status.st-current { color: #34d399; background: rgba(52,211,153,.10); border: 1px solid rgba(52,211,153,.32); }
.ds-item-status.st-from    { color: #fbbf24; background: rgba(251,191,36,.10); border: 1px solid rgba(251,191,36,.32); }
.ds-item-status.st-to      { color: #60a5fa; background: rgba(96,165,250,.10); border: 1px solid rgba(96,165,250,.32); }
.ds-item-status.st-retired { color: #7c90ae; background: rgba(124,144,174,.10); border: 1px solid rgba(124,144,174,.32); }
.ds-item-role { color: #cbd5e1; font-size: 12.5px; line-height: 1.5; margin: 0 0 6px; }
.ds-item-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-family:'JetBrains Mono',monospace; font-size: 10.5px; color: #7c90ae; }
.ds-item-meta a { color: #60a5fa; text-decoration: none; }
.ds-item-meta a:hover { text-decoration: underline; }

/* OSS table */
.ds-oss-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ds-oss-table th, .ds-oss-table td { padding: 9px 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,.04); }
.ds-oss-table th { font-family:'JetBrains Mono',monospace; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: #7c90ae; }
.ds-oss-table td a { color: var(--ds-color, #60a5fa); text-decoration: none; font-weight: 700; }
.ds-oss-table td a:hover { text-decoration: underline; }
.ds-oss-stars { font-family:'JetBrains Mono',monospace; color: #fbbf24; font-size: 12px; }

.ds-culture, .ds-hiring { color: #cbd5e1; font-size: 14px; line-height: 1.65; margin: 0; }

.ds-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.ds-links a { padding: 8px 14px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.10); color: #cbd5e1; font-family:'JetBrains Mono',monospace; font-size: 12px; text-decoration: none; }
.ds-links a:hover { background: rgba(96,165,250,.10); border-color: rgba(96,165,250,.32); color: #60a5fa; }

.ds-disclaimer { margin-top: 22px; padding: 12px 16px; background:rgba(251,191,36,.06); border:1px solid rgba(251,191,36,.22); border-radius:10px; color:#fde68a; font-size:12.5px; line-height:1.6; }
.ds-disclaimer strong { color:#fbbf24; font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; display:block; margin-bottom:4px; }

.ds-sources { margin-top: 18px; padding: 14px 16px; background:rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.05); border-radius:10px; }
.ds-sources h3 { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#7c90ae; margin:0 0 6px; }
.ds-sources ul { margin:0; padding-left:18px; color:#a8b6d1; font-size:12.5px; line-height:1.65; }
.ds-sources a { color:#60a5fa; text-decoration:none; }
.ds-sources a:hover { text-decoration:underline; }
</style>`;

function freshnessClass(lastReviewed) {
  try {
    const [y, m] = lastReviewed.split('-').map(Number);
    const reviewed = new Date(y, m - 1, 1);
    const now = new Date();
    const months = (now.getFullYear() - reviewed.getFullYear()) * 12 + (now.getMonth() - reviewed.getMonth());
    if (months <= 4) return { cls: 'fresh', label: 'Révisé ' + lastReviewed };
    if (months <= 12) return { cls: 'warn',  label: 'Révisé ' + lastReviewed };
    return                       { cls: 'stale', label: '⚠ Vieux (' + lastReviewed + ')' };
  } catch (_) {
    return { cls: 'warn', label: lastReviewed || '—' };
  }
}

function pageJsonLd(d) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': d.company,
    'foundingDate': String(d.founded),
    'description': d.tldr,
    'url': `https://certquests.com/devstack/${d.slug}/`,
    'sameAs': [d.engBlogUrl, d.careersUrl].filter(Boolean)
  };
}

function renderItem(it) {
  const st = STATUS_LABEL[it.status] || STATUS_LABEL.current;
  const srcIcon = it.source ? (SOURCE_TYPE_ICON[it.source.type] || '🔗') : '';
  const srcLink = it.source
    ? ` · <a href="${esc(it.source.url)}" target="_blank" rel="noopener nofollow">${srcIcon} ${esc(it.source.label)}</a>`
    : '';
  const since = it.since ? `depuis ${esc(it.since)}` : '';
  const lastSeen = it.lastSeen ? ` · vu ${esc(it.lastSeen)}` : '';
  return `<div class="ds-item">
    <div class="ds-item-head">
      <span class="ds-item-name">${esc(it.name)}</span>
      <span class="ds-item-status ${st.cls}">${esc(st.label)}</span>
    </div>
    <p class="ds-item-role">${esc(it.role)}</p>
    <div class="ds-item-meta">${since}${lastSeen}${srcLink}</div>
  </div>`;
}

function renderCategory(c) {
  const items = (c.items || []).map(renderItem).join('');
  return `<div class="ds-category">
    <div class="ds-category-name">▸ ${esc(c.category)}</div>
    <div class="ds-items">${items}</div>
  </div>`;
}

function renderOSS(oss) {
  if (!oss || !oss.length) return '<p style="color:#7c90ae;font-size:13px">Pas de contributions open-source notables documentées dans cette revue.</p>';
  const rows = oss.map(o => `<tr>
    <td><a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.name)}</a></td>
    <td>${esc(o.what)}</td>
    <td class="ds-oss-stars">${esc(o.stars || '—')}</td>
  </tr>`).join('');
  return `<table class="ds-oss-table">
    <thead><tr><th>Projet</th><th>Description</th><th>Stars</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderPage(d) {
  const ld = pageJsonLd(d);
  const fresh = freshnessClass(d.lastReviewed);
  const totalItems = (d.stack || []).reduce((s, c) => s + (c.items || []).length, 0);
  const categoriesHtml = (d.stack || []).map(renderCategory).join('');
  const ossHtml = renderOSS(d.oss);
  const sourcesHtml = (d.sources || []).map(s =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>Le stack tech de ${esc(d.company)} en 2026 — DevStack · CertQuests</title>
  <meta name="description" content="${esc(d.tldr)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="https://certquests.com/devstack/${esc(d.slug)}/" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://certquests.com/devstack/${esc(d.slug)}/" />
  <meta property="og:title" content="Le stack tech de ${esc(d.company)} en 2026" />
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

<main class="ds-page" id="main-content" style="--ds-color:${esc(d.color)}">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span><a href="/devstack/">DevStack</a><span>/</span>${esc(d.company)}
  </nav>

  <section class="ds-hero">
    <span class="eyebrow" style="color:${esc(d.color)};background:${esc(d.color)}1a;border:1px solid ${esc(d.color)}55">${esc(d.icon)} DevStack · ${esc(d.vertical)}</span>
    <h1>Le stack tech de ${esc(d.company)} en 2026</h1>
    <p class="lede">${esc(d.tldr)}</p>
    <div class="ds-meta">
      <span class="pill ${fresh.cls}">${esc(fresh.label)}</span>
      <span class="pill">Fondé ${d.founded} · ${esc(d.hq)}</span>
      <span class="pill">${(d.stack || []).length} catégories · ${totalItems} composants</span>
    </div>
  </section>

  <div class="ds-scale"><strong>📈 Échelle (signaux publics)</strong>${esc(d.scaleSignal)}</div>

  <section class="ds-section">
    <h2>🧱 Stack technique (sourcé public)</h2>
    ${categoriesHtml}
  </section>

  <section class="ds-section">
    <h2>🐙 Open-source notable</h2>
    ${ossHtml}
  </section>

  <section class="ds-section">
    <h2>🏛️ Culture ingénierie</h2>
    <p class="ds-culture">${esc(d.culture)}</p>
  </section>

  <section class="ds-section">
    <h2>👋 Recrutement</h2>
    <p class="ds-hiring">${esc(d.hiring)}</p>
    <div class="ds-links">
      ${d.careersUrl ? `<a href="${esc(d.careersUrl)}" target="_blank" rel="noopener">💼 Careers ${esc(d.company)}</a>` : ''}
      ${d.engBlogUrl ? `<a href="${esc(d.engBlogUrl)}" target="_blank" rel="noopener">📝 Blog ingénierie</a>` : ''}
    </div>
  </section>

  <div class="ds-disclaimer"><strong>Méthodologie & limites</strong>Ce dossier compile ce qui a été publiquement disclosed via le blog ingénierie, les job postings, GitHub et les talks de conférence. Ce n'est pas un audit complet — la stack interne est plus large. Chaque item liste sa source pour que tu puisses re-vérifier. Les stacks tech bougent — la date "Révisé" en haut indique la fraîcheur de cette revue.</div>

  <div class="ds-sources">
    <h3>Sources principales</h3>
    <ul>${sourcesHtml}</ul>
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
    `<button type="button" class="ds-tag-filter" data-tag="${esc(t)}">#${esc(t)}</button>`
  ).join('');

  const cards = datasets.map(d => {
    const tagList = (d.tags || []).join(' ');
    const totalItems = (d.stack || []).reduce((s, c) => s + (c.items || []).length, 0);
    return `<a class="ds-card" href="/devstack/${esc(d.slug)}/" data-tags="${esc(tagList)}" style="--ds-color:${esc(d.color)}">
      <div class="ds-card-head">
        <span class="ds-card-icon">${esc(d.icon)}</span>
        <span class="ds-card-vertical">${esc(d.vertical)}</span>
      </div>
      <div class="ds-card-title">${esc(d.company)}</div>
      <div class="ds-card-tldr">${esc(d.tldr)}</div>
      <div class="ds-card-meta">${totalItems} composants · Révisé ${esc(d.lastReviewed)}</div>
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>DevStack — Tech stack public des grandes boîtes IT · CertQuests</title>
  <meta name="description" content="Le stack tech des grandes boîtes (Vinted, Doctolib, Revolut, Netflix…) compilé depuis leur blog ingénierie, job postings et GitHub publics. Sources citées, date de revue affichée." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://certquests.com/devstack/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://certquests.com/devstack/" />
  <meta property="og:title" content="DevStack — Tech stack public des grandes boîtes IT" />
  <meta property="og:description" content="Sources citées, méthodologie transparente." />
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
    .ds-filters { display:flex; flex-wrap:wrap; gap:6px; margin: 18px 0 0; }
    .ds-tag-filter { font-family:'JetBrains Mono',monospace; font-size: 11px; padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); color: #a8b6d1; cursor: pointer; min-height: 32px; }
    .ds-tag-filter:hover { background: rgba(96,165,250,.10); border-color: rgba(96,165,250,.32); color: #60a5fa; }
    .ds-tag-filter.is-active { background: rgba(96,165,250,.18); border-color: rgba(96,165,250,.5); color: #c7d8f7; }

    .ds-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; margin-top: 18px; }
    .ds-card { display: flex; flex-direction: column; gap: 8px; padding: 18px; background: linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.005)); border: 1px solid rgba(255,255,255,.07); border-left: 3px solid var(--ds-color, #60a5fa); border-radius: 14px; text-decoration: none; color: inherit; transition: transform .18s, border-color .18s, box-shadow .18s; }
    .ds-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.18); box-shadow: 0 14px 30px -16px rgba(0,0,0,.6); }
    .ds-card[hidden] { display: none !important; }
    .ds-card-head { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
    .ds-card-icon { font-size: 26px; }
    .ds-card-vertical { font-family:'JetBrains Mono',monospace; font-size: 10.5px; letter-spacing: .12em; color: var(--ds-color, #60a5fa); text-align: right; }
    .ds-card-title { font-family:'Space Grotesk',sans-serif; font-weight: 800; font-size: 19px; color: #f1f5fb; }
    .ds-card-tldr { font-size: 13px; color: #a8b6d1; line-height: 1.55; }
    .ds-card-meta { font-family:'JetBrains Mono',monospace; font-size: 10.5px; color: #506885; margin-top: auto; padding-top: 6px; }
  </style>
</head>
<body>
${HEADER}

<main class="ds-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span>DevStack
  </nav>

  <section class="ds-hero">
    <span class="eyebrow" style="color:#60a5fa;background:rgba(96,165,250,.10);border:1px solid rgba(96,165,250,.32)">🧱 DevStack</span>
    <h1>Le tech stack des <span style="background: linear-gradient(135deg,#60a5fa 0%, #34d399 60%, #fbbf24 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent;">grandes boîtes IT</span></h1>
    <p class="lede">Compilé depuis leur blog ingénierie, job postings publics et GitHub. Chaque composant a une source citée. Les stacks bougent — chaque dossier affiche sa date de revue.</p>
    <div class="ds-filters" role="group" aria-label="Filter by tag">
      <button type="button" class="ds-tag-filter is-active" data-tag="">Tous</button>
      ${tagFilters}
    </div>
  </section>

  <section>
    <div class="ds-grid" id="ds-grid">${cards}</div>
  </section>

  <div class="ds-disclaimer" style="margin-top:30px"><strong>Méthodologie</strong>Aucun insider gossip. On compile uniquement ce qui a été publiquement disclosed. Si une info est fausse ou périmée, signale via <a href="/contact.html" style="color:#fbbf24">/contact</a> avec la source à jour.</div>
</main>

${FOOTER}

<script>
(function () {
  var filters = document.querySelectorAll('.ds-tag-filter');
  var cards = document.querySelectorAll('.ds-card');
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
    console.error('No data/devstack directory found.');
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
  console.log(`gen-devstack: ${written} pages + 1 index`);
}

main();
