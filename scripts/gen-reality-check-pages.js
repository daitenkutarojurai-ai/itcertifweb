#!/usr/bin/env node
/**
 * scripts/gen-reality-check-pages.js — Phase 6.8 (RealityCheck)
 *
 * Reads each `data/reality-check/<slug>.json` and emits:
 *   - reality-check/<slug>/index.html — myth-busting page with verdict
 *   - reality-check/index.html        — grid index by verdict
 *
 * Run: `node scripts/gen-reality-check-pages.js`
 *   (or `npm run gen-reality-check`). Idempotent.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'reality-check');
const OUT_DIR  = path.join(ROOT, 'reality-check');

const CACHE_BUST = 'v=87';

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
      <a href="/news/">News</a>
      <a href="https://play.google.com/store/apps/details?id=com.certquest.app" class="web-header-badge" target="_blank" rel="noopener">Google Play</a>
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
.rc-page { max-width: 900px; margin: 0 auto; padding: 0 20px 80px; color: #e8edf8; }
.breadcrumb { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#506885; padding:14px 0 0; }
.breadcrumb a { color:#7c90ae; text-decoration:none; }
.breadcrumb a:hover { color:#e8edf8; }
.breadcrumb span { color:#7c90ae; margin:0 8px; }

.rc-hero { padding: 32px 8px 8px; }
.rc-hero .eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#c084fc; background:rgba(192,132,252,.10); border:1px solid rgba(192,132,252,.32); padding:5px 14px; border-radius:999px; margin-bottom:14px; }
.rc-hero h1 { font-family:'Space Grotesk',sans-serif; font-size:clamp(28px,4.4vw,42px); font-weight:800; letter-spacing:-.02em; margin:0 0 8px; line-height:1.15; color:#f1f5fb; }
.rc-hero .lede { font-size:15.5px; line-height:1.6; color:#a8b6d1; max-width:760px; margin:0; }
.rc-meta { display:flex; flex-wrap:wrap; gap:8px; margin: 14px 0 4px; font-size:12px; color:#7c90ae; font-family:'JetBrains Mono',monospace; }
.rc-meta .pill { padding:4px 10px; border-radius:999px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); }

.rc-claim-verdict { display: grid; grid-template-columns: 1fr; gap: 12px; margin: 26px 0 0; }
@media (min-width: 720px) { .rc-claim-verdict { grid-template-columns: 1fr 220px; } }
.rc-claim { padding: 18px 20px; background: rgba(248,113,113,.06); border: 1px solid rgba(248,113,113,.25); border-left: 4px solid #f87171; border-radius: 12px; color:#fecaca; font-size: 15px; line-height: 1.6; }
.rc-claim strong { display: block; font-family:'JetBrains Mono',monospace; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color:#f87171; margin-bottom: 6px; }
.rc-verdict-badge { padding: 18px 20px; border-radius: 12px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; font-family:'Space Grotesk',sans-serif; }
.rc-verdict-badge .label { font-family:'JetBrains Mono',monospace; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; opacity: .9; }
.rc-verdict-badge .verdict { font-size: 22px; font-weight: 800; line-height: 1.1; margin: 4px 0; }
.rc-verdict-badge .note { font-size: 11.5px; opacity: .85; }

.rc-tldr { margin: 22px 0 0; padding: 16px 18px; background:rgba(96,165,250,.08); border:1px solid rgba(96,165,250,.25); border-radius:12px; color:#c7d8f7; font-size:14.5px; line-height:1.6; }
.rc-tldr strong { color:#60a5fa; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; display:block; margin-bottom:4px; }

.rc-section { margin: 28px 0 0; padding: 22px 22px 18px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06); border-radius:14px; }
.rc-section h2 { font-family:'Space Grotesk',sans-serif; font-size:19px; font-weight:700; margin:0 0 14px; color:#f1f5fb; letter-spacing:-.015em; }
.rc-section p { color:#cbd5e1; font-size:14.5px; line-height:1.7; margin: 0 0 10px; }
.rc-section p:last-child { margin: 0; }

/* Fact cards */
.rc-fact { padding: 16px 18px; background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.06); border-left: 3px solid #fbbf24; border-radius: 12px; margin-bottom: 12px; }
.rc-fact .fact-claim { font-family:'Space Grotesk',sans-serif; font-size: 15px; font-weight: 700; color: #fbbf24; margin-bottom: 6px; line-height: 1.35; }
.rc-fact .fact-claim::before { content: '"'; }
.rc-fact .fact-claim::after  { content: '"'; }
.rc-fact .fact-body { color: #cbd5e1; font-size: 13.5px; line-height: 1.65; margin: 6px 0 8px; }
.rc-fact .fact-meta { display:flex; flex-wrap:wrap; gap:6px; align-items:center; font-family:'JetBrains Mono',monospace; font-size:10.5px; }
.rc-fact .type-pill { padding: 2px 8px; border-radius: 999px; }
.rc-fact .type-data        { color:#34d399; background:rgba(52,211,153,.08); border:1px solid rgba(52,211,153,.25); }
.rc-fact .type-qualitative { color:#fbbf24; background:rgba(251,191,36,.08); border:1px solid rgba(251,191,36,.25); }
.rc-fact .type-community   { color:#fb923c; background:rgba(249,115,22,.08); border:1px solid rgba(249,115,22,.25); }
.rc-fact .type-law         { color:#60a5fa; background:rgba(96,165,250,.08); border:1px solid rgba(96,165,250,.25); }
.rc-fact .fact-source-link { color:#60a5fa; text-decoration:none; }
.rc-fact .fact-source-link:hover { text-decoration:underline; }

/* Two-column who-can / who-can't */
.rc-can-cant { display: grid; gap: 12px; }
@media (min-width: 720px) { .rc-can-cant { grid-template-columns: 1fr 1fr; } }
.rc-can, .rc-cant { padding: 16px 18px; border-radius: 12px; font-size: 13.5px; line-height: 1.65; color:#cbd5e1; }
.rc-can  { background:rgba(52,211,153,.07); border:1px solid rgba(52,211,153,.22); }
.rc-cant { background:rgba(248,113,113,.07); border:1px solid rgba(248,113,113,.22); }
.rc-can h3, .rc-cant h3 { font-family:'JetBrains Mono',monospace; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; margin: 0 0 8px; }
.rc-can  h3 { color:#34d399; }
.rc-cant h3 { color:#f87171; }

.rc-ceiling { margin: 22px 0 0; padding: 18px 20px; background:rgba(251,191,36,.08); border:1px solid rgba(251,191,36,.28); border-radius:12px; color:#fde68a; font-size:14px; line-height:1.65; }
.rc-ceiling strong { color:#fbbf24; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; display:block; margin-bottom:6px; }

.rc-final { margin: 22px 0 0; padding: 20px 22px; background:linear-gradient(180deg, rgba(192,132,252,.10), rgba(192,132,252,.03)); border:1px solid rgba(192,132,252,.32); border-radius:12px; color:#e8d9ff; font-size:15px; line-height:1.6; }
.rc-final strong { color:#c084fc; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; display:block; margin-bottom:6px; }

.rc-sources { margin-top: 18px; padding: 14px 16px; background:rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.05); border-radius:10px; }
.rc-sources h3 { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#7c90ae; margin:0 0 6px; }
.rc-sources ul { margin:0; padding-left:18px; color:#a8b6d1; font-size:12.5px; line-height:1.65; }
.rc-sources a { color:#60a5fa; text-decoration:none; }
.rc-sources a:hover { text-decoration:underline; }
.rc-sources .disclaimer { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.05); font-size: 11px; color:#506885; line-height: 1.55; }

.rc-related { margin-top: 18px; padding: 14px 16px; background:rgba(96,165,250,.07); border:1px solid rgba(96,165,250,.20); border-radius:10px; }
.rc-related h3 { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#60a5fa; margin:0 0 6px; }
.rc-related a { color:#93c5fd; text-decoration:none; }
.rc-related a:hover { text-decoration:underline; }
</style>`;

const VERDICT_NOTE = {
  'true':        'Confirmé par les données',
  'partly-true': 'Vrai sous conditions',
  'depends':     'Selon contexte',
  'outdated':    'Plus valable en 2026',
  'false':       'Contredit par les données'
};

function freshnessClass(lastReviewed) {
  try {
    const [y, m] = lastReviewed.split('-').map(Number);
    const reviewed = new Date(y, m - 1, 1);
    const now = new Date();
    const months = (now.getFullYear() - reviewed.getFullYear()) * 12 + (now.getMonth() - reviewed.getMonth());
    if (months <= 3) return { cls: 'fresh', label: 'Révisé ' + lastReviewed };
    if (months <= 9) return { cls: 'warn',  label: 'Révisé ' + lastReviewed };
    return                       { cls: 'stale', label: '⚠ Vieux (' + lastReviewed + ')' };
  } catch (_) {
    return { cls: 'warn', label: lastReviewed || '—' };
  }
}

function pageJsonLd(d) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    'datePublished': d.lastReviewed + '-01',
    'url': `https://certquests.com/reality-check/${d.slug}/`,
    'claimReviewed': d.claim,
    'reviewRating': {
      '@type': 'Rating',
      'ratingValue': verdictRating(d.verdict),
      'bestRating': '5',
      'worstRating': '1',
      'alternateName': d.verdictLabel
    },
    'author': { '@type': 'Organization', 'name': 'CertQuests' },
    'itemReviewed': { '@type': 'Claim', 'datePublished': d.lastReviewed + '-01', 'appearance': d.claim }
  };
}
function verdictRating(v) {
  return ({ 'true': '5', 'partly-true': '3', 'depends': '3', 'outdated': '2', 'false': '1' }[v]) || '3';
}

function renderFact(f) {
  const typeCls = 'type-' + (f.type || 'qualitative');
  const typeLabel = ({ data: 'donnée', qualitative: 'qualitatif', community: 'communauté', law: 'loi / régulation' }[f.type] || 'qualitatif');
  const src = f.source
    ? ` · <a class="fact-source-link" href="${esc(f.source.url)}" target="_blank" rel="noopener nofollow">${esc(f.source.label)}</a>`
    : '';
  return `<div class="rc-fact">
    <div class="fact-claim">${esc(f.claim)}</div>
    <div class="fact-body">${esc(f.fact)}</div>
    <div class="fact-meta"><span class="type-pill ${typeCls}">${esc(typeLabel)}</span>${src}</div>
  </div>`;
}

function renderPage(d) {
  const ld = pageJsonLd(d);
  const fresh = freshnessClass(d.lastReviewed);
  const factsHtml = d.facts.map(renderFact).join('');
  const sourcesHtml = (d.sources || []).map(s =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`
  ).join('');
  const relatedHtml = (d.relatedLinks || []).map(r =>
    `<li><a href="${esc(r.url)}">${esc(r.label)}</a></li>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>${esc(d.title)} — RealityCheck · CertQuests</title>
  <meta name="description" content="${esc(d.tldr)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="https://certquests.com/reality-check/${esc(d.slug)}/" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://certquests.com/reality-check/${esc(d.slug)}/" />
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

<main class="rc-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span><a href="/reality-check/">RealityCheck</a><span>/</span>${esc(d.title)}
  </nav>

  <section class="rc-hero">
    <span class="eyebrow">🧐 RealityCheck ${esc(d.icon)}</span>
    <h1>${esc(d.title)}</h1>
    <p class="lede">On démonte les promesses YouTube/LinkedIn avec des données vérifiables. Pas de hype, pas de bashing — juste ce que les chiffres et les communautés disent vraiment.</p>
    <div class="rc-meta">
      <span class="pill">${esc(fresh.label)}</span>
      <span class="pill">${d.facts.length} faits vérifiés</span>
    </div>
  </section>

  <div class="rc-claim-verdict">
    <div class="rc-claim">
      <strong>L'affirmation testée</strong>
      ${esc(d.claim)}
    </div>
    <div class="rc-verdict-badge" style="background:${esc(d.verdictColor)}1a;border:2px solid ${esc(d.verdictColor)}88;color:${esc(d.verdictColor)}">
      <span class="label">Verdict</span>
      <span class="verdict">${esc(d.verdictLabel)}</span>
      <span class="note">${esc(VERDICT_NOTE[d.verdict] || '')}</span>
    </div>
  </div>

  <div class="rc-tldr"><strong>TL;DR</strong>${esc(d.tldr)}</div>

  <section class="rc-section">
    <h2>📊 Ce que les données disent vraiment</h2>
    ${factsHtml}
  </section>

  <section class="rc-section">
    <h2>👥 Pour qui ça marche, pour qui ça ne marche pas</h2>
    <div class="rc-can-cant">
      <div class="rc-can"><h3>✅ Qui peut</h3><p>${esc(d.whoCan)}</p></div>
      <div class="rc-cant"><h3>❌ Qui ne peut pas</h3><p>${esc(d.whoCant)}</p></div>
    </div>
  </section>

  <div class="rc-ceiling"><strong>📏 Le plafond réel</strong>${esc(d.realCeiling)}</div>

  <div class="rc-final"><strong>🎯 Verdict honnête</strong>${esc(d.honestVerdict)}</div>

  <div class="rc-sources">
    <h3>Sources</h3>
    <ul>${sourcesHtml}</ul>
    <p class="disclaimer">Sources institutionnelles et communautaires citées au moment de la révision. Cette page sera mise à jour si les barèmes, lois ou données de marché changent — mais les analyses 'reality check' rotent vite, vérifie la date de révision avant de prendre une décision.</p>
  </div>

  ${relatedHtml ? `<div class="rc-related"><h3>À lire aussi</h3><ul style="margin:0;padding-left:18px">${relatedHtml}</ul></div>` : ''}
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
    `<button type="button" class="rc-tag-filter" data-tag="${esc(t)}">#${esc(t)}</button>`
  ).join('');

  const cards = datasets.map(d => {
    const tagList = (d.tags || []).join(' ');
    return `<a class="rc-card" href="/reality-check/${esc(d.slug)}/" data-tags="${esc(tagList)}" style="--rc-color:${esc(d.verdictColor)}">
      <div class="rc-card-head">
        <span class="rc-card-icon">${esc(d.icon)}</span>
        <span class="rc-card-verdict" style="color:${esc(d.verdictColor)};border-color:${esc(d.verdictColor)}55;background:${esc(d.verdictColor)}1a">${esc(d.verdictLabel)}</span>
      </div>
      <div class="rc-card-title">${esc(d.title)}</div>
      <div class="rc-card-tldr">${esc(d.tldr)}</div>
      <div class="rc-card-meta">Révisé ${esc(d.lastReviewed)} · ${d.facts.length} faits</div>
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>RealityCheck — Vrai/faux des promesses IT et business en 2026 · CertQuests</title>
  <meta name="description" content="On démonte les promesses YouTube et LinkedIn : DevOps à 100k, freelance à 200k, Bali en remote, dropshipping passif. Faits cités, verdicts honnêtes." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://certquests.com/reality-check/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://certquests.com/reality-check/" />
  <meta property="og:title" content="RealityCheck — Vrai/faux des promesses IT et business" />
  <meta property="og:description" content="On démonte les promesses YouTube et LinkedIn avec des faits cités." />
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
    .rc-filters { display:flex; flex-wrap:wrap; gap:6px; margin: 18px 0 0; }
    .rc-tag-filter { font-family:'JetBrains Mono',monospace; font-size: 11px; padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); color: #a8b6d1; cursor: pointer; min-height: 32px; }
    .rc-tag-filter:hover { background: rgba(192,132,252,.10); border-color: rgba(192,132,252,.32); color: #c084fc; }
    .rc-tag-filter.is-active { background: rgba(192,132,252,.18); border-color: rgba(192,132,252,.5); color: #e8d9ff; }

    .rc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; margin-top: 18px; }
    .rc-card { display: flex; flex-direction: column; gap: 8px; padding: 18px; background: linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.005)); border: 1px solid rgba(255,255,255,.07); border-left: 3px solid var(--rc-color, #c084fc); border-radius: 14px; text-decoration: none; color: inherit; transition: transform .18s, border-color .18s, box-shadow .18s; }
    .rc-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.18); box-shadow: 0 14px 30px -16px rgba(0,0,0,.6); }
    .rc-card[hidden] { display: none !important; }
    .rc-card-head { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
    .rc-card-icon { font-size: 24px; }
    .rc-card-verdict { font-family:'JetBrains Mono',monospace; font-size: 10.5px; padding: 3px 9px; border-radius: 999px; border:1px solid transparent; }
    .rc-card-title { font-family:'Space Grotesk',sans-serif; font-weight: 700; font-size: 16px; color: #f1f5fb; line-height: 1.3; }
    .rc-card-tldr { font-size: 13px; color: #a8b6d1; line-height: 1.55; }
    .rc-card-meta { font-family:'JetBrains Mono',monospace; font-size: 10.5px; color: #506885; margin-top: auto; padding-top: 6px; }
  </style>
</head>
<body>
${HEADER}

<main class="rc-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span>RealityCheck
  </nav>

  <section class="rc-hero">
    <span class="eyebrow">🧐 RealityCheck</span>
    <h1>Vrai/faux des promesses <span style="background: linear-gradient(135deg,#c084fc 0%, #60a5fa 60%, #34d399 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent;">IT et business</span></h1>
    <p class="lede">On démonte les promesses YouTube et LinkedIn avec des données vérifiables : salaires DevOps à 100k, freelance à 200k, Bali en remote, dropshipping passif… Chaque page liste les faits, cite les sources, et tranche.</p>
    <div class="rc-filters" role="group" aria-label="Filter by tag">
      <button type="button" class="rc-tag-filter is-active" data-tag="">Toutes</button>
      ${tagFilters}
    </div>
  </section>

  <section>
    <div class="rc-grid" id="rc-grid">${cards}</div>
  </section>
</main>

${FOOTER}

<script>
(function () {
  var filters = document.querySelectorAll('.rc-tag-filter');
  var cards = document.querySelectorAll('.rc-card');
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
    console.error('No data/reality-check directory found.');
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
  console.log(`gen-reality-check: ${written} pages + 1 index`);
}

main();
