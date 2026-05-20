#!/usr/bin/env node
/**
 * scripts/gen-toolradar-pages.js — Phase 6.11 (ToolRadar)
 *
 * Reads each `data/tool-radar/<slug>.json` and emits:
 *   - tool-radar/<slug>/index.html — ranked comparison page
 *   - tool-radar/index.html        — grid index
 *
 * Run: `node scripts/gen-toolradar-pages.js` (or `npm run gen-toolradar`).
 * Idempotent — overwrites generated HTML on every run.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'tool-radar');
const OUT_DIR  = path.join(ROOT, 'tool-radar');

const CACHE_BUST = 'v=97';

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
.tr-page { max-width: 1080px; margin: 0 auto; padding: 0 20px 80px; color: #e8edf8; }
.breadcrumb { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#506885; padding:14px 0 0; }
.breadcrumb a { color:#7c90ae; text-decoration:none; }
.breadcrumb a:hover { color:#e8edf8; }
.breadcrumb span { color:#7c90ae; margin:0 8px; }

.tr-hero { padding: 32px 8px 8px; }
.tr-hero .eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; padding:5px 14px; border-radius:999px; margin-bottom:14px; }
.tr-hero h1 { font-family:'Space Grotesk',sans-serif; font-size:clamp(28px,4.4vw,42px); font-weight:800; letter-spacing:-.02em; margin:0 0 8px; line-height:1.15; color:#f1f5fb; }
.tr-hero h1 .grad { background: linear-gradient(135deg,#60a5fa 0%, #34d399 60%, #fbbf24 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; }
.tr-hero .lede { font-size:16px; line-height:1.6; color:#a8b6d1; max-width:760px; margin:0; }
.tr-meta { display:flex; flex-wrap:wrap; gap:8px; margin: 14px 0 4px; font-size:12px; color:#7c90ae; font-family:'JetBrains Mono',monospace; }
.tr-meta .pill { padding:4px 10px; border-radius:999px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); }
.tr-meta .pill.fresh { color:#6ee7b7; border-color:rgba(52,211,153,.3); background:rgba(52,211,153,.08); }
.tr-meta .pill.warn  { color:#fbbf24; border-color:rgba(251,191,36,.3); background:rgba(251,191,36,.08); }
.tr-meta .pill.stale { color:#f87171; border-color:rgba(248,113,113,.3); background:rgba(248,113,113,.08); }

.tr-honesty { margin: 18px 0 0; padding: 12px 14px; background: rgba(251,191,36,.06); border:1px solid rgba(251,191,36,.22); border-radius: 10px; color:#fde68a; font-size: 12.5px; line-height: 1.55; }
.tr-honesty strong { color: #fbbf24; font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:.12em; text-transform: uppercase; display: block; margin-bottom: 3px; }

.tr-section { margin: 28px 0 0; padding: 22px 22px 18px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06); border-radius:14px; }
.tr-section h2 { font-family:'Space Grotesk',sans-serif; font-size:20px; font-weight:700; margin:0 0 14px; color:#f1f5fb; letter-spacing:-.015em; }

/* Ranking table */
.tr-table-wrap { overflow-x: auto; margin-top: 8px; }
table.tr-table { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 580px; }
.tr-table thead th { padding: 10px 12px; text-align: left; font-family:'JetBrains Mono',monospace; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: #7c90ae; background: rgba(0,0,0,.25); border-bottom: 1px solid rgba(255,255,255,.06); }
.tr-table tbody td { padding: 11px 12px; border-bottom: 1px solid rgba(255,255,255,.04); color: #cbd5e1; vertical-align: middle; }
.tr-table tbody tr:last-child td { border-bottom: none; }
.tr-table tbody tr:hover { background: rgba(255,255,255,.02); }
.tr-rank { font-family:'JetBrains Mono',monospace; font-weight:700; color:#7c90ae; width:44px; }
.tr-rank.gold { color: #fbbf24; }
.tr-rank.silver { color: #cbd5e1; }
.tr-rank.bronze { color: #f97316; }
.tr-name { font-family:'Space Grotesk',sans-serif; font-weight: 700; color: #f1f5fb; font-size: 14px; }
.tr-vendor { font-family:'JetBrains Mono',monospace; font-size: 10.5px; color: #7c90ae; }
.tr-score-cell { font-family:'JetBrains Mono',monospace; text-align: center; min-width: 38px; }
.tr-score-cell.s5 { color: #34d399; font-weight: 700; }
.tr-score-cell.s4 { color: #6ee7b7; }
.tr-score-cell.s3 { color: #a8b6d1; }
.tr-score-cell.s2 { color: #fbbf24; }
.tr-score-cell.s1 { color: #f87171; }
.tr-total { font-family:'Space Grotesk',sans-serif; font-weight: 800; font-size: 16px; color: #fbbf24; text-align: right; min-width: 56px; }
.tr-total.is-winner { color: #34d399; }

/* Tool cards */
.tr-tool { padding: 18px; background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.07); border-left: 4px solid var(--tr-color, #60a5fa); border-radius: 12px; margin-bottom: 14px; }
.tr-tool-anchor { display:block; height: 0; margin-top: -90px; padding-top: 90px; }
.tr-tool-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
.tr-tool-head h3 { font-family:'Space Grotesk',sans-serif; font-size: 18px; font-weight: 700; color: #f1f5fb; margin: 0; }
.tr-tool-head .vendor { font-family:'JetBrains Mono',monospace; font-size: 10.5px; letter-spacing: .12em; color: var(--tr-color, #60a5fa); }
.tr-tool .pitch { font-size: 14px; color: #cbd5e1; line-height: 1.55; margin: 4px 0 10px; }
.tr-tool .pricing { font-family:'JetBrains Mono',monospace; font-size: 12.5px; padding: 6px 12px; background: rgba(0,0,0,.3); border: 1px solid rgba(255,255,255,.08); border-radius: 8px; color: #fbbf24; display: inline-block; margin-bottom: 10px; }
.tr-tool .pricing a { color: #60a5fa; text-decoration: none; margin-left: 8px; font-size: 11.5px; }
.tr-tool .pros-cons { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
@media (max-width: 640px) { .tr-tool .pros-cons { grid-template-columns: 1fr; } }
.tr-pros, .tr-cons { padding: 10px 12px; border-radius: 10px; font-size: 13px; line-height: 1.55; }
.tr-pros { background: rgba(52,211,153,.07); border: 1px solid rgba(52,211,153,.22); color: #d1fae5; }
.tr-cons { background: rgba(248,113,113,.07); border: 1px solid rgba(248,113,113,.22); color: #fecaca; }
.tr-pros strong, .tr-cons strong { font-family:'JetBrains Mono',monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; display: block; margin-bottom: 4px; }
.tr-pros strong { color: #34d399; }
.tr-cons strong { color: #f87171; }
.tr-pros ul, .tr-cons ul { margin: 0; padding-left: 18px; }
.tr-pros li, .tr-cons li { margin-bottom: 3px; }
.tr-pros a, .tr-cons a { color: inherit; text-decoration: underline; opacity: .75; }
.tr-bestfor { margin-top: 10px; padding: 8px 12px; background: rgba(96,165,250,.08); border: 1px solid rgba(96,165,250,.22); border-radius: 8px; color: #c7d8f7; font-size: 12.5px; line-height: 1.5; }
.tr-bestfor strong { color: #60a5fa; font-family:'JetBrains Mono',monospace; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; margin-right: 6px; }
.tr-affiliate { display: inline-block; margin-top: 12px; padding: 8px 14px; border-radius: 10px; background: rgba(96,165,250,.10); border: 1px solid rgba(96,165,250,.3); color: #60a5fa; font-family:'Space Grotesk',sans-serif; font-weight: 700; font-size: 13px; text-decoration: none; }
.tr-affiliate:hover { background: rgba(96,165,250,.18); }

/* Verdict */
.tr-verdict { display: grid; gap: 10px; }
.tr-verdict-row { display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 12px 14px; background: rgba(52,211,153,.06); border: 1px solid rgba(52,211,153,.22); border-radius: 10px; align-items: center; }
.tr-verdict-row .profile { font-size: 13.5px; color: #d1fae5; }
.tr-verdict-row .winner-pill { font-family:'Space Grotesk',sans-serif; font-weight: 700; font-size: 13.5px; padding: 6px 12px; background: rgba(52,211,153,.20); border: 1px solid rgba(52,211,153,.4); border-radius: 999px; color: #a7f3d0; text-decoration: none; white-space: nowrap; }
.tr-verdict-overall { padding: 16px 18px; background: rgba(251,191,36,.10); border: 1px solid rgba(251,191,36,.32); border-radius: 12px; color: #fde68a; font-size: 15px; line-height: 1.55; margin-bottom: 12px; }
.tr-verdict-overall strong { display: block; font-family:'JetBrains Mono',monospace; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: #fbbf24; margin-bottom: 4px; }

/* Criteria explainer */
.tr-criteria { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 8px; }
.tr-criterion { padding: 12px 14px; background: rgba(0,0,0,.2); border: 1px solid rgba(255,255,255,.05); border-radius: 10px; }
.tr-criterion .label { font-family:'Space Grotesk',sans-serif; font-weight: 700; color: #f1f5fb; font-size: 13.5px; }
.tr-criterion .weight { font-family:'JetBrains Mono',monospace; font-size: 11px; color: #fbbf24; margin-left: 6px; }
.tr-criterion .desc  { font-size: 12.5px; color: #a8b6d1; margin: 4px 0 4px; line-height: 1.5; }
.tr-criterion .scale { font-family:'JetBrains Mono',monospace; font-size: 10.5px; color: #7c90ae; }

.tr-sources { margin-top: 18px; padding: 12px 16px; background:rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.05); border-radius:10px; }
.tr-sources h3 { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#7c90ae; margin:0 0 6px; }
.tr-sources ul { margin:0; padding-left:18px; color:#a8b6d1; font-size:12.5px; line-height:1.6; }
.tr-sources a { color:#60a5fa; text-decoration:none; }
.tr-sources a:hover { text-decoration:underline; }
</style>`;

function freshnessClass(lastReviewed) {
  try {
    const [y, m] = lastReviewed.split('-').map(Number);
    const reviewed = new Date(y, m - 1, 1);
    const now = new Date();
    const months = (now.getFullYear() - reviewed.getFullYear()) * 12 + (now.getMonth() - reviewed.getMonth());
    if (months <= 2) return { cls: 'fresh', label: 'Révisé ' + lastReviewed };
    if (months <= 6) return { cls: 'warn',  label: 'Révisé ' + lastReviewed };
    return                       { cls: 'stale', label: '⚠ Vieux (' + lastReviewed + ')' };
  } catch (_) {
    return { cls: 'warn', label: lastReviewed || '—' };
  }
}

function normalizeWeights(criteria) {
  const sum = criteria.reduce((a, c) => a + (c.weight || 0), 0) || 1;
  return criteria.map(c => ({ ...c, _w: (c.weight || 0) / sum }));
}

function computeTotal(tool, criteria) {
  return criteria.reduce((acc, c) => {
    const s = Number(tool.scores && tool.scores[c.id]);
    if (!Number.isFinite(s)) return acc;
    return acc + c._w * s;
  }, 0);
}

function pageJsonLd(d, rankedTools) {
  const items = rankedTools.map((t, i) => ({
    '@type': 'ListItem',
    'position': i + 1,
    'name': t.name,
    'url': `https://certquests.com/tool-radar/${d.slug}/#tool-${t.slug}`
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': d.title,
    'description': d.tldr,
    'url': `https://certquests.com/tool-radar/${d.slug}/`,
    'numberOfItems': rankedTools.length,
    'itemListElement': items
  };
}

function renderToolCard(t, color) {
  const proItems = (t.pros || []).map(p => {
    const src = p.source ? ` <a href="${esc(p.source)}" target="_blank" rel="noopener nofollow">[source]</a>` : '';
    return `<li>${esc(p.text)}${src}</li>`;
  }).join('');
  const conItems = (t.cons || []).map(p => {
    const src = p.source ? ` <a href="${esc(p.source)}" target="_blank" rel="noopener nofollow">[source]</a>` : '';
    return `<li>${esc(p.text)}${src}</li>`;
  }).join('');

  const aff = t.affiliate && t.affiliate.url
    ? `<a class="tr-affiliate" href="${esc(t.affiliate.url)}" target="_blank" rel="noopener nofollow">→ ${esc(t.affiliate.label || 'Try ' + t.name)}</a>`
    : '';

  return `<div class="tr-tool" style="--tr-color:${esc(color)}">
    <span class="tr-tool-anchor" id="tool-${esc(t.slug)}"></span>
    <div class="tr-tool-head">
      <h3>${esc(t.name)}</h3>
      <span class="vendor">${esc(t.vendor)}</span>
    </div>
    <p class="pitch">${esc(t.pitch)}</p>
    <div class="pricing">${esc(t.pricing)}<a href="${esc(t.pricingUrl)}" target="_blank" rel="noopener">[pricing officiel]</a></div>
    <div class="pros-cons">
      <div class="tr-pros"><strong>Pros</strong><ul>${proItems}</ul></div>
      <div class="tr-cons"><strong>Cons</strong><ul>${conItems}</ul></div>
    </div>
    <div class="tr-bestfor"><strong>Best for —</strong>${esc(t.bestFor)}</div>
    ${aff}
  </div>`;
}

function renderPage(d) {
  const criteria = normalizeWeights(d.criteria);
  const ranked = d.tools.map(t => ({ tool: t, total: computeTotal(t, criteria) }))
    .sort((a, b) => b.total - a.total);
  const winnerSlug = ranked[0].tool.slug;

  const ld = pageJsonLd(d, ranked.map(r => r.tool));
  const fresh = freshnessClass(d.lastReviewed);

  // Ranking table
  const tableHead = `<tr>
    <th>#</th>
    <th>Tool</th>
    ${criteria.map(c => `<th title="${esc(c.description)}">${esc(c.label)}<br><span style="color:#506885;font-weight:400">w=${(c._w * 100).toFixed(0)}%</span></th>`).join('')}
    <th style="text-align:right">Total /5</th>
  </tr>`;
  const tableRows = ranked.map((r, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    const scoreCells = criteria.map(c => {
      const s = Number(r.tool.scores && r.tool.scores[c.id]) || 0;
      return `<td class="tr-score-cell s${s}">${s}</td>`;
    }).join('');
    const totalClass = r.tool.slug === winnerSlug ? 'is-winner' : '';
    return `<tr>
      <td class="tr-rank ${rankClass}">${rankIcon}</td>
      <td><a href="#tool-${esc(r.tool.slug)}" style="color:inherit;text-decoration:none"><span class="tr-name">${esc(r.tool.name)}</span><br><span class="tr-vendor">${esc(r.tool.vendor)}</span></a></td>
      ${scoreCells}
      <td class="tr-total ${totalClass}">${r.total.toFixed(1)}</td>
    </tr>`;
  }).join('');

  // Criteria explainer
  const criteriaHtml = criteria.map(c => `<div class="tr-criterion">
    <div><span class="label">${esc(c.label)}</span><span class="weight">${(c._w * 100).toFixed(0)}%</span></div>
    <div class="desc">${esc(c.description)}</div>
    <div class="scale">${esc(c.scale)}</div>
  </div>`).join('');

  // Verdict
  const overallTool = d.tools.find(t => t.slug === d.verdict.overall);
  const verdictRows = (d.verdict.conditional || []).map(v => {
    const tool = d.tools.find(t => t.slug === v.winner);
    const toolName = tool ? tool.name : v.winner;
    return `<div class="tr-verdict-row">
      <div class="profile"><strong>${esc(v.profile)}</strong> — ${esc(v.reason)}</div>
      <a class="winner-pill" href="#tool-${esc(v.winner)}">→ ${esc(toolName)}</a>
    </div>`;
  }).join('');

  // Tool cards
  const toolCards = ranked.map(r => renderToolCard(r.tool, d.color)).join('');

  // Sources
  const sourcesHtml = (d.sources || []).map(s =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="${esc(d.lang || 'fr')}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>${esc(d.title)} · CertQuests</title>
  <meta name="description" content="${esc(d.tldr)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="https://certquests.com/tool-radar/${esc(d.slug)}/" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://certquests.com/tool-radar/${esc(d.slug)}/" />
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

<main class="tr-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span><a href="/tool-radar/">ToolRadar</a><span>/</span>${esc(d.title)}
  </nav>

  <section class="tr-hero">
    <span class="eyebrow" style="color:${esc(d.color)};background:${esc(d.color)}1a;border:1px solid ${esc(d.color)}55">${esc(d.icon)} ToolRadar</span>
    <h1>${esc(d.title.replace(/(\d{4})/, '<span class="grad">$1</span>'))}</h1>
    <p class="lede">${esc(d.tldr)}</p>
    <div class="tr-meta">
      <span class="pill ${fresh.cls}">${esc(fresh.label)}</span>
      <span class="pill">${ranked.length} tools comparés</span>
      <span class="pill">${criteria.length} critères</span>
    </div>
    <div class="tr-honesty"><strong>Méthodologie</strong>${esc(d.disclaimer)}</div>
  </section>

  <section class="tr-section">
    <h2>🏆 Classement (score pondéré)</h2>
    <div class="tr-table-wrap">
      <table class="tr-table">
        <thead>${tableHead}</thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  </section>

  <section class="tr-section">
    <h2>🎯 Verdict par profil</h2>
    <div class="tr-verdict-overall">
      <strong>Vainqueur global</strong>
      ${esc(overallTool ? overallTool.name : d.verdict.overall)} — meilleur score pondéré sur ces critères.
      Mais regarde le verdict par profil ci-dessous, le "meilleur" dépend de TON contexte.
    </div>
    <div class="tr-verdict">${verdictRows}</div>
  </section>

  <section class="tr-section">
    <h2>📋 Critères de scoring (transparence)</h2>
    <div class="tr-criteria">${criteriaHtml}</div>
  </section>

  <section class="tr-section">
    <h2>🔍 Détail outil par outil</h2>
    ${toolCards}
  </section>

  <div class="tr-sources">
    <h3>Sources de référence</h3>
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
    `<button type="button" class="tr-tag-filter" data-tag="${esc(t)}">#${esc(t)}</button>`
  ).join('');

  const cards = datasets.map(d => {
    const tagList = (d.tags || []).join(' ');
    return `<a class="tr-card" href="/tool-radar/${esc(d.slug)}/" data-tags="${esc(tagList)}" style="--tr-color:${esc(d.color)}">
      <div class="tr-card-head">
        <span class="tr-card-icon">${esc(d.icon)}</span>
        <span class="tr-card-meta">${d.tools.length} tools · Révisé ${esc(d.lastReviewed)}</span>
      </div>
      <div class="tr-card-title">${esc(d.title)}</div>
      <div class="tr-card-tldr">${esc(d.tldr)}</div>
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>ToolRadar — Comparatifs AI / SaaS structurés · CertQuests</title>
  <meta name="description" content="Comparatifs structurés d'outils AI et SaaS : meilleur AI pour dev, meilleur AI support client, alternative Notion AI, AI pour étudiant IT. Méthodologie transparente, sources citées." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://certquests.com/tool-radar/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://certquests.com/tool-radar/" />
  <meta property="og:title" content="ToolRadar — Comparatifs AI / SaaS structurés" />
  <meta property="og:description" content="Méthodologie transparente, scoring pondéré, sources citées." />
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
    .tr-filters { display:flex; flex-wrap:wrap; gap:6px; margin: 18px 0 0; }
    .tr-tag-filter { font-family:'JetBrains Mono',monospace; font-size: 11px; padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); color: #a8b6d1; cursor: pointer; min-height: 32px; }
    .tr-tag-filter:hover { background: rgba(96,165,250,.10); border-color: rgba(96,165,250,.32); color: #60a5fa; }
    .tr-tag-filter.is-active { background: rgba(96,165,250,.18); border-color: rgba(96,165,250,.5); color: #c7d8f7; }

    .tr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; margin-top: 18px; }
    .tr-card { display: flex; flex-direction: column; gap: 8px; padding: 18px; background: linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.005)); border: 1px solid rgba(255,255,255,.07); border-left: 3px solid var(--tr-color, #60a5fa); border-radius: 14px; text-decoration: none; color: inherit; transition: transform .18s, border-color .18s, box-shadow .18s; }
    .tr-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.18); box-shadow: 0 14px 30px -16px rgba(0,0,0,.6); }
    .tr-card[hidden] { display: none !important; }
    .tr-card-head { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
    .tr-card-icon { font-size: 24px; }
    .tr-card-meta { font-family:'JetBrains Mono',monospace; font-size: 10.5px; color: #7c90ae; }
    .tr-card-title { font-family:'Space Grotesk',sans-serif; font-weight: 700; font-size: 17px; color: #f1f5fb; line-height: 1.25; }
    .tr-card-tldr { font-size: 13px; color: #a8b6d1; line-height: 1.55; }
  </style>
</head>
<body>
${HEADER}

<main class="tr-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span>ToolRadar
  </nav>

  <section class="tr-hero">
    <span class="eyebrow" style="color:#60a5fa;background:rgba(96,165,250,.10);border:1px solid rgba(96,165,250,.32)">📡 ToolRadar</span>
    <h1>Comparatifs AI / SaaS <span class="grad">structurés</span></h1>
    <p class="lede">Choisir un outil AI ou SaaS sans se faire avoir par le marketing. Chaque comparatif liste les critères, leur poids, le scoring tool-par-tool, et un verdict par profil. Sources citées. Méthodologie transparente.</p>
    <div class="tr-filters" role="group" aria-label="Filter by tag">
      <button type="button" class="tr-tag-filter is-active" data-tag="">All</button>
      ${tagFilters}
    </div>
  </section>

  <section>
    <div class="tr-grid" id="tr-grid">${cards}</div>
  </section>

  <div class="tr-honesty" style="margin-top:30px"><strong>Honesty</strong>Scoring fondé sur faits observables (tarifs, capacités, intégrations). Pas de bench hands-on systématique. Toujours tester en trial avant de signer. Affiliate slots vides en 2026-05 — aucun lien partenaire actif pour le moment.</div>
</main>

${FOOTER}

<script>
/* Tag filter */
(function () {
  var filters = document.querySelectorAll('.tr-tag-filter');
  var cards = document.querySelectorAll('.tr-card');
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
    console.error('No data/tool-radar directory found.');
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
  console.log(`gen-toolradar: ${written} category pages + 1 index`);
}

main();
