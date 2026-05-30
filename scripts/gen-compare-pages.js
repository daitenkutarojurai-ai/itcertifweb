#!/usr/bin/env node
/**
 * scripts/gen-compare-pages.js — Phase 6.2.
 *
 * Reads each `data/comparisons/<slug>.json`, pulls per-cert metadata
 * from `data/index.json` (question_count, est_hours), optionally pulls
 * the salary median from `data/salary/<alias>.france.json` if a
 * `salaryAlias` is set, and renders one static page per slug under
 * `compare/<slug>/index.html`. Also rebuilds `compare/index.html`
 * listing every page (legacy alternative pages + new comparisons).
 *
 * Run: `node scripts/gen-compare-pages.js` (or `npm run gen-compare`).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COMP_DIR = path.join(ROOT, 'data', 'comparisons');
const SALARY_DIR = path.join(ROOT, 'data', 'salary');
const INDEX_JSON = path.join(ROOT, 'data', 'index.json');
const OUT_DIR  = path.join(ROOT, 'compare');

const CACHE_BUST = 'v=106';

/* ── data lookups ─────────────────────────────────────────────── */
const certPacks = (function () {
  const idx = JSON.parse(fs.readFileSync(INDEX_JSON, 'utf8'));
  const out = {};
  (idx.brands || []).forEach(b => (b.packs || []).forEach(p => { out[p.id] = p; }));
  return out;
})();

function salaryMedianFor(alias) {
  if (!alias) return null;
  const fp = path.join(SALARY_DIR, `${alias}.france.json`);
  if (!fs.existsSync(fp)) return null;
  try {
    const s = JSON.parse(fs.readFileSync(fp, 'utf8'));
    return s.bands && s.bands.senior ? s.bands.senior.median : null;
  } catch (_) { return null; }
}

/* ── helpers ──────────────────────────────────────────────────── */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmtMoney(n) { return typeof n === 'number' ? `${(n / 1000).toFixed(0)}k€` : '—'; }

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
      <div class="web-footer-text">CertQuests — Free IT certification training, courses, and decision-making tools</div>
    </div>
  </footer>`;

const SHARED_STYLE = `<style>
.cmp-page { max-width: 1100px; margin: 0 auto; padding: 0 20px 80px; color: #e8edf8; }
.breadcrumb { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#506885; padding:14px 0 0; }
.breadcrumb a { color:#7c90ae; text-decoration:none; }
.breadcrumb a:hover { color:#e8edf8; }
.breadcrumb span { color:#7c90ae; margin:0 8px; }

.cmp-hero { padding: 32px 8px 8px; }
.cmp-hero .eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#a78bfa; background:rgba(168,139,250,.10); border:1px solid rgba(168,139,250,.32); padding:5px 14px; border-radius:999px; margin-bottom:14px; }
.cmp-hero h1 { font-family:'Space Grotesk',sans-serif; font-size:clamp(28px,4.4vw,42px); font-weight:800; letter-spacing:-.02em; margin:0 0 8px; line-height:1.15; color:#f1f5fb; }
.cmp-hero h1 .grad { background: linear-gradient(135deg,#a78bfa 0%, #60a5fa 60%, #34d399 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; }
.cmp-hero .lede { font-size:16px; line-height:1.6; color:#a8b6d1; max-width:760px; margin:0; }
.cmp-meta { display:flex; flex-wrap:wrap; gap:10px; margin: 14px 0 4px; font-size:12px; color:#7c90ae; font-family:'JetBrains Mono',monospace; }
.cmp-meta .pill { padding:4px 10px; border-radius:999px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); }
.cmp-meta .pill.fresh { color:#6ee7b7; border-color:rgba(52,211,153,.3); background:rgba(52,211,153,.08); }

.cmp-tldr { margin: 24px 0 0; padding: 16px 18px; background:rgba(168,139,250,.10); border:1px solid rgba(168,139,250,.32); border-radius:12px; color:#e8edf8; font-size:15px; line-height:1.55; }
.cmp-tldr strong { color:#a78bfa; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; display:block; margin-bottom:4px; }

.cmp-section { margin: 36px 0 0; padding: 22px 22px 18px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06); border-radius:14px; }
.cmp-section h2 { font-family:'Space Grotesk',sans-serif; font-size:20px; font-weight:700; margin:0 0 12px; color:#f1f5fb; letter-spacing:-.015em; }

.cmp-table { width:100%; border-collapse:collapse; font-size:14px; }
.cmp-table th { text-align:left; font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:#7c90ae; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.08); vertical-align:bottom; }
.cmp-table td { padding:12px; border-bottom:1px solid rgba(255,255,255,.04); color:#e8edf8; vertical-align:top; }
.cmp-table th .vendor { display:block; font-size:10px; opacity:.7; margin-top:2px; }
.cmp-table .row-label { font-family:'JetBrains Mono',monospace; font-size:11px; color:#7c90ae; text-transform:uppercase; letter-spacing:.1em; width:120px; }
.cmp-table .accent { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:18px; color:#fbbf24; }
.cmp-cert-color { display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:6px; vertical-align:middle; }

.proncon { display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:14px; }
.proncon-card { padding:14px 14px 12px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.07); border-radius:12px; border-left:3px solid var(--cert-color, #60a5fa); }
.proncon-card h3 { font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:700; margin:0 0 4px; color:#f1f5fb; }
.proncon-card .vendor { font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:#7c90ae; margin-bottom:10px; }
.proncon-card .best   { font-size:13px; color:#a8b6d1; font-style:italic; margin: 0 0 12px; padding: 8px 10px; background:rgba(0,0,0,.2); border-radius:8px; }
.proncon-card ul { margin:0 0 12px; padding-left:18px; font-size:13px; line-height:1.55; color:#a8b6d1; }
.proncon-card .pros li::marker { color:#34d399; }
.proncon-card .cons li::marker { color:#f87171; }

.verdicts { display:flex; flex-direction:column; gap:10px; }
.verdict { display:grid; grid-template-columns: 1fr auto; align-items:start; gap:14px; padding:14px 16px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.07); border-radius:12px; }
@media (max-width:640px) { .verdict { grid-template-columns: 1fr; } }
.verdict .profile { font-size:14.5px; color:#e8edf8; line-height:1.45; }
.verdict .why { font-size:12.5px; color:#7c90ae; margin-top:4px; line-height:1.5; }
.verdict .winner { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:999px; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:12px; color:#0a0f1d; background:#fbbf24; white-space:nowrap; }
.verdict .winner-color { width:8px; height:8px; border-radius:2px; background:var(--c, #fbbf24); }

.cta-row { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }
.cta-row a { padding:11px 18px; border-radius:12px; font-family:'Space Grotesk',sans-serif; font-size:14px; font-weight:700; text-decoration:none; transition:transform .15s, filter .15s; color:#0a0f1d; }
.cta-row a:hover { transform:translateY(-1px); filter:brightness(1.05); }
</style>`;

function renderTable(certs) {
  const headers = certs.map(c => `<th><span class="cmp-cert-color" style="background:${esc(c.color)}"></span>${esc(c.displayName)}<span class="vendor">${esc(c.vendor)}</span></th>`).join('');

  function row(label, cells) {
    return `<tr><td class="row-label">${label}</td>${cells.map(v => `<td>${v}</td>`).join('')}</tr>`;
  }

  const meta = certs.map(c => certPacks[c.id] || {});
  return `<table class="cmp-table">
    <thead><tr><th></th>${headers}</tr></thead>
    <tbody>
      ${row('Code examen', certs.map(c => `<code>${esc(c.examCode)}</code>`))}
      ${row('Prix examen', certs.map(c => c.examFeeUsd ? `${c.examFeeUsd}$` : '—'))}
      ${row('Heures d’étude', meta.map(m => m.est_hours ? `~${m.est_hours}h` : '—'))}
      ${row('Questions banque CertQuests', meta.map(m => m.question_count ? `<a href="/train.html?pack=${esc(m.id)}" style="color:#60a5fa">${m.question_count} Q →</a>` : '—'))}
      ${row('Salaire médian senior FR', certs.map(c => {
        const m = salaryMedianFor(c.salaryAlias);
        return m ? `<span class="accent">${fmtMoney(m)}</span> <a href="/salaire/${esc(c.salaryAlias)}/france/" style="color:#60a5fa;font-size:12px">détails  →</a>` : '<span style="color:#506885">—</span>';
      }))}
      ${row('Difficulté', certs.map(c => {
        const m = certPacks[c.id] || {};
        return m.difficulty ? esc(m.difficulty) : '—';
      }))}
    </tbody>
  </table>`;
}

function renderProsCons(certs) {
  return certs.map(c => `<div class="proncon-card" style="--cert-color:${esc(c.color)}">
    <h3>${esc(c.displayName)}</h3>
    <div class="vendor">${esc(c.vendor)} · ${esc(c.examCode)}</div>
    <div class="best">${esc(c.bestFor)}</div>
    <ul class="pros">${(c.pros || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul>
    <ul class="cons">${(c.cons || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul>
  </div>`).join('');
}

function renderVerdicts(d) {
  const certById = Object.fromEntries(d.certs.map(c => [c.id, c]));
  return d.verdicts.map(v => {
    const c = certById[v.winner] || { displayName: v.winner, color: '#fbbf24' };
    return `<div class="verdict">
      <div>
        <div class="profile">${esc(v.profile)}</div>
        <div class="why">${esc(v.why || '')}</div>
      </div>
      <span class="winner" style="--c:${esc(c.color)}"><span class="winner-color"></span>${esc(c.displayName)}</span>
    </div>`;
  }).join('');
}

function renderCtas(certs) {
  return certs.map(c => {
    const m = certPacks[c.id] || {};
    if (!m.id) return '';
    return `<a href="/train.html?pack=${esc(m.id)}" style="background:${esc(c.color)}">⚡ S'entraîner ${esc(c.examCode)}</a>`;
  }).join('');
}

function jsonLd(d) {
  const url = `https://certquests.com/compare/${d.slug}/`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': url + '#article',
        'headline': `${d.title} — ${d.subtitle}`,
        'description': d.tldr,
        'datePublished': d.lastReviewed + '-01',
        'dateModified': d.lastReviewed + '-01',
        'url': url,
        'publisher': {
          '@type': 'Organization',
          'name': 'CertQuests',
          'url': 'https://certquests.com/'
        }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': url + '#breadcrumbs',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://certquests.com/' },
          { '@type': 'ListItem', 'position': 2, 'name': 'Comparateur', 'item': 'https://certquests.com/compare/' },
          { '@type': 'ListItem', 'position': 3, 'name': d.title, 'item': url }
        ]
      }
    ]
  };
}

// Cap a meta description at ≤160 chars, breaking at the last word boundary
// and adding an ellipsis if we truncated mid-sentence.
function capDesc(s, max = 160) {
  if (!s) return '';
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return (at > max * 0.7 ? cut.slice(0, at) : cut).replace(/[ ,;:.\-—]+$/, '') + '…';
}

function renderPage(d) {
  const ld = jsonLd(d);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>${esc(capDesc(d.title, 50))} · CertQuests</title>
  <meta name="description" content="${esc(capDesc(`${d.title.replace(/[\s?!.]+$/, '')}. ${d.tldr} Comparatif 2026 : prix, salaires, difficulté, profils gagnants.`))}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="https://certquests.com/compare/${esc(d.slug)}/" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://certquests.com/compare/${esc(d.slug)}/" />
  <meta property="og:title" content="${esc(d.title)} — CertQuests" />
  <meta property="og:description" content="${esc(d.tldr)}" />
  <meta property="og:site_name" content="CertQuests" />
  <meta property="og:locale" content="fr_FR" />
  <meta property="og:image" content="https://certquests.com/src/assets/og/og-default.png?v=1" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(d.title)} — CertQuests" />
  <meta name="twitter:description" content="${esc(capDesc(d.tldr))}" />
  <meta name="twitter:image" content="https://certquests.com/src/assets/og/og-default.png?v=1" />
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

<main class="cmp-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span><a href="/compare/">Comparateur</a><span>/</span>${esc(d.title)}
  </nav>

  <section class="cmp-hero">
    <span class="eyebrow">⚖️ Comparateur</span>
    <h1>${esc(d.title)} <br><span class="grad">${esc(d.subtitle)}</span></h1>
    <p class="lede">Comparatif clair, sans bullshit — décide en 5 minutes laquelle correspond à ton profil.</p>
    <div class="cmp-meta">
      <span class="pill fresh">Révisé ${esc(d.lastReviewed)}</span>
      <span class="pill">${d.certs.length} certifications</span>
      <span class="pill">${d.verdicts.length} profils analysés</span>
    </div>
  </section>

  <div class="cmp-tldr"><strong>TL;DR</strong>${esc(d.tldr)}</div>

  <section class="cmp-section">
    <h2>Comparatif rapide</h2>
    ${renderTable(d.certs)}
  </section>

  <section class="cmp-section">
    <h2>Pour qui chacune ?</h2>
    <div class="proncon">${renderProsCons(d.certs)}</div>
  </section>

  <section class="cmp-section">
    <h2>Le verdict, par profil</h2>
    <p style="color:#a8b6d1;font-size:14px;line-height:1.5;margin:0 0 14px">Pas un palmarès — chaque profil a une cert qui colle mieux. Trouve le tien.</p>
    <div class="verdicts">${renderVerdicts(d)}</div>
  </section>

  <section class="cmp-section">
    <h2>Démarre avec celle que tu as choisie</h2>
    <div class="cta-row">${renderCtas(d.certs)}</div>
  </section>
</main>

${FOOTER}

<script src="/src/cq-core.js?${CACHE_BUST}" defer></script>
<script src="/src/mascot-loader.js?${CACHE_BUST}" defer></script>
</body>
</html>
`;
}

function renderIndex(comparisons, legacyPages) {
  const items = comparisons.map(d => `<a class="cmp-card" href="/compare/${esc(d.slug)}/">
    <div class="cmp-card-eyebrow">⚖️ ${d.certs.length}-way comparison</div>
    <div class="cmp-card-title">${esc(d.title)}</div>
    <div class="cmp-card-sub">${esc(d.subtitle)}</div>
    <div class="cmp-card-meta">Révisé ${esc(d.lastReviewed)} · ${d.verdicts.length} profils</div>
  </a>`).join('');

  const legacy = legacyPages.map(slug => `<a class="cmp-card cmp-card--legacy" href="/compare/${esc(slug)}/">
    <div class="cmp-card-eyebrow">📋 Alternative</div>
    <div class="cmp-card-title">${esc(slug.replace(/-/g, ' '))}</div>
  </a>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>Comparateur de certifications IT — CertQuests</title>
  <meta name="description" content="Comparatifs sans bullshit : AWS vs Azure vs GCP, CCNA vs Network+, CISSP vs Security+. Verdict par profil, sources citées." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://certquests.com/compare/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://certquests.com/compare/" />
  <meta property="og:title" content="Comparateur de certifications IT — CertQuests" />
  <meta property="og:description" content="Comparatifs sans bullshit : AWS vs Azure vs GCP, CCNA vs Network+, CISSP vs Security+. Verdict par profil, sources citées." />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Comparateur de certifications IT — CertQuests" />
  <meta name="twitter:description" content="Comparatifs sans bullshit : AWS vs Azure vs GCP, CCNA vs Network+, CISSP vs Security+. Verdict par profil, sources citées." />
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" href="/favicon.ico?v=4" sizes="any" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/src/styles/main.css?${CACHE_BUST}" />
  <link rel="stylesheet" href="/src/styles/desktop.css?${CACHE_BUST}" />
  ${SHARED_STYLE}
  <style>
    .cmp-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:14px; margin-top:18px; }
    .cmp-card { display:flex; flex-direction:column; gap:6px; padding:18px; background:linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.005)); border:1px solid rgba(255,255,255,.07); border-left:3px solid #a78bfa; border-radius:14px; text-decoration:none; color:inherit; transition:transform .18s, border-color .18s, box-shadow .18s; }
    .cmp-card:hover { transform:translateY(-2px); border-color:rgba(255,255,255,.18); box-shadow:0 14px 30px -16px rgba(0,0,0,.6); }
    .cmp-card--legacy { border-left-color:#60a5fa; }
    .cmp-card-eyebrow { font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:#a78bfa; }
    .cmp-card-title { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:17px; color:#f1f5fb; line-height:1.25; text-transform:capitalize; }
    .cmp-card-sub { font-size:13px; color:#a8b6d1; line-height:1.4; }
    .cmp-card-meta { font-family:'JetBrains Mono',monospace; font-size:10.5px; color:#506885; margin-top:auto; padding-top:6px; }
  </style>
</head>
<body>
${HEADER}

<main class="cmp-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span>Comparateur
  </nav>
  <section class="cmp-hero">
    <span class="eyebrow">⚖️ Comparateur</span>
    <h1>Quelle cert <span class="grad">choisir en 2026 ?</span></h1>
    <p class="lede">Comparatifs honnêtes par profil — pas un palmarès. AWS vs Azure, CCNA vs Network+, CISSP vs Security+, etc.</p>
  </section>

  <section class="cmp-section">
    <h2>Comparatifs cert vs cert</h2>
    <div class="cmp-grid">${items}</div>
  </section>

  ${legacyPages.length ? `<section class="cmp-section">
    <h2>Alternatives à des outils payants</h2>
    <div class="cmp-grid">${legacy}</div>
  </section>` : ''}
</main>

${FOOTER}

<script src="/src/cq-core.js?${CACHE_BUST}" defer></script>
<script src="/src/mascot-loader.js?${CACHE_BUST}" defer></script>
</body>
</html>
`;
}

function main() {
  const files = fs.readdirSync(COMP_DIR).filter(f => f.endsWith('.json')).sort();
  const datasets = files.map(f => JSON.parse(fs.readFileSync(path.join(COMP_DIR, f), 'utf8')));

  let written = 0;
  for (const d of datasets) {
    const dir = path.join(OUT_DIR, d.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPage(d), 'utf8');
    written++;
    console.log('wrote', path.relative(ROOT, path.join(dir, 'index.html')));
  }

  /* Pre-existing alternative-tool pages we want to keep listed. */
  const legacy = fs.readdirSync(OUT_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && !datasets.some(d => d.slug === e.name))
    .map(e => e.name);

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderIndex(datasets, legacy), 'utf8');
  console.log('wrote', path.relative(ROOT, path.join(OUT_DIR, 'index.html')), `(${datasets.length} comparisons + ${legacy.length} legacy pages)`);
}

main();
