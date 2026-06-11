#!/usr/bin/env node
/**
 * scripts/gen-salary-pages.js — Phase 6.1.
 *
 * Reads every `data/salary/<cert>.<country>.json`, renders one static
 * HTML page per file at `salaire/<cert>/<country>/index.html`, plus a
 * top-level index at `salaire/index.html`.
 *
 * Static + SEO-indexable. Pages share the canonical CertQuests header
 * (kept in sync separately by scripts/sync-header.js); the body is
 * authored here.
 *
 * Run: `node scripts/gen-salary-pages.js` (or `npm run gen-salary`).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'salary');
const OUT_DIR  = path.join(ROOT, 'salaire');

const CACHE_BUST = 'v=134';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmtMoney(n, cur, sym) {
  if (typeof n !== 'number') return '—';
  const k = (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1);
  return `${sym || ''}${k}k${sym ? '' : ' ' + (cur || '')}`.trim();
}
function paybackMonths(roi) {
  if (!roi || !roi.annualSalaryUpliftEur) return null;
  const cost = (roi.examCostEur || 0) +
               (roi.studyHours || 0) * (roi.hourlyOpportunityCostEur || 0);
  const monthlyUplift = roi.annualSalaryUpliftEur / 12;
  if (monthlyUplift <= 0) return null;
  return Math.max(1, Math.round(cost / monthlyUplift));
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
      <div class="web-footer-text">CertQuests — Free IT certification training, courses, and salary insights</div>
    </div>
  </footer>`;

const SHARED_STYLE = `<style>
:root { --salary-accent:#a78bfa; }
.salary-page { max-width: 980px; margin: 0 auto; padding: 0 20px 80px; color: #e8edf8; }
.breadcrumb { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#506885; padding:14px 0 0; }
.breadcrumb a { color:#7c90ae; text-decoration:none; }
.breadcrumb a:hover { color:#e8edf8; }
.breadcrumb span { color:#7c90ae; margin:0 8px; }

.salary-hero { padding: 32px 8px 8px; }
.salary-hero .eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#a78bfa; background:rgba(168,139,250,.10); border:1px solid rgba(168,139,250,.32); padding:5px 14px; border-radius:999px; margin-bottom:14px; }
.salary-hero h1 { font-family:'Space Grotesk',sans-serif; font-size:clamp(28px,4.4vw,42px); font-weight:800; letter-spacing:-.02em; margin:0 0 8px; line-height:1.15; color:#f1f5fb; }
.salary-hero h1 .grad { background: linear-gradient(135deg,#a78bfa 0%, #60a5fa 60%, #34d399 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; }
.salary-hero .lede { font-size:16px; line-height:1.6; color:#a8b6d1; max-width:680px; margin:0; }
.salary-meta { display:flex; flex-wrap:wrap; gap:10px; margin: 14px 0 4px; font-size:12px; color:#7c90ae; font-family:'JetBrains Mono',monospace; }
.salary-meta .pill { padding:4px 10px; border-radius:999px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); }
.salary-meta .pill.fresh { color:#6ee7b7; border-color:rgba(52,211,153,.3); background:rgba(52,211,153,.08); }

.salary-section { margin: 36px 0 0; padding: 22px 22px 18px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06); border-radius:14px; }
.salary-section h2 { font-family:'Space Grotesk',sans-serif; font-size:20px; font-weight:700; margin:0 0 12px; color:#f1f5fb; letter-spacing:-.015em; }
.salary-section p { color:#a8b6d1; font-size:14px; line-height:1.55; margin: 0 0 8px; }

.bands-grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px; margin-top:6px; }
@media (max-width:720px) { .bands-grid { grid-template-columns: 1fr; } }
.band-card { padding:14px 14px 12px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.07); border-radius:12px; }
.band-card .band-tier { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#7c90ae; }
.band-card .band-median { font-family:'Space Grotesk',sans-serif; font-size:28px; font-weight:800; color:#f1f5fb; margin:4px 0; letter-spacing:-.02em; }
.band-card .band-range { font-size:13px; color:#a8b6d1; }
.band-card .band-yoe { font-size:11.5px; color:#506885; margin-top:6px; font-family:'JetBrains Mono',monospace; }

.jobs-list { display:flex; flex-wrap:wrap; gap:8px; margin-top:6px; }
.jobs-list .job-chip { padding:6px 12px; background:rgba(168,139,250,.08); border:1px solid rgba(168,139,250,.28); border-radius:999px; font-size:13px; color:#d1c4ff; }

.timeline { display:flex; flex-direction:column; gap:6px; margin-top:6px; counter-reset: y; }
.timeline-row { display:flex; align-items:flex-start; gap:14px; padding:12px 12px 12px 16px; background:rgba(255,255,255,.02); border-left:3px solid #60a5fa; border-radius:8px; }
.timeline-row .y { font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:700; color:#60a5fa; min-width:46px; }
.timeline-row .t { flex:1 1 auto; font-size:14px; color:#e8edf8; }
.timeline-row .s { font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:700; color:#fbbf24; }

.compare-table { width:100%; border-collapse:collapse; margin-top:6px; font-size:14px; }
.compare-table th { text-align:left; font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:#7c90ae; padding:8px 10px; border-bottom:1px solid rgba(255,255,255,.08); }
.compare-table td { padding:10px; border-bottom:1px solid rgba(255,255,255,.04); color:#e8edf8; }
.compare-table .country { font-weight:600; }
.compare-table .median { font-family:'JetBrains Mono',monospace; color:#fbbf24; }
.compare-table .here { background:rgba(168,139,250,.08); }

.roi-card { display:grid; grid-template-columns: 1.2fr 1fr; gap:16px; align-items:center; }
@media (max-width:720px) { .roi-card { grid-template-columns: 1fr; } }
.roi-card .roi-figure { font-family:'Space Grotesk',sans-serif; font-size:38px; font-weight:800; color:#34d399; }
.roi-card .roi-sub    { font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:#7c90ae; margin-top:4px; }
.roi-card ul { margin:6px 0 0; padding-left:18px; color:#a8b6d1; font-size:13.5px; line-height:1.55; }

.cta-row { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }
.cta-row a { padding:11px 18px; border-radius:12px; font-family:'Space Grotesk',sans-serif; font-size:14px; font-weight:700; text-decoration:none; transition:transform .15s, background .15s; }
.cta-row a.primary { background:#a78bfa; color:#0a0f1d; }
.cta-row a.primary:hover { transform:translateY(-1px); filter:brightness(1.05); }
.cta-row a.secondary { background:rgba(255,255,255,.04); color:#e8edf8; border:1px solid rgba(255,255,255,.12); }
.cta-row a.secondary:hover { background:rgba(255,255,255,.08); }

.sources { margin-top:24px; padding:12px 16px; background:rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.05); border-radius:10px; }
.sources h3 { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#7c90ae; margin:0 0 6px; }
.sources ul { margin:0; padding-left:18px; color:#a8b6d1; font-size:12.5px; line-height:1.5; }
.sources a { color:#60a5fa; text-decoration:none; }
.sources a:hover { text-decoration:underline; }
.sources .disclaimer { margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,.05); font-size:11px; color:#506885; line-height:1.5; }
</style>`;

function jsonLd(d, payback) {
  const url = `https://certquests.com/salaire/${d.cert}/${d.country}/`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        // Occupation (not JobPosting) — these are salary guides, not job
        // openings. JobPosting on non-hiring pages risks a Google spammy-
        // structured-data manual action; Occupation is the purpose-built type
        // for salary estimates.
        '@type': 'Occupation',
        '@id': url + '#salary',
        'name': `${d.certTitle} — ${d.countryLabel}`,
        'description': `Fourchettes salariales (junior/senior/lead), postes accessibles, progression carrière 5 ans et ROI pour la certification ${d.certTitle} en ${d.countryLabel}. Données mises à jour ${d.lastReviewed}.`,
        'occupationLocation': { '@type': 'Country', 'name': d.countryLabel },
        'estimatedSalary': {
          '@type': 'MonetaryAmountDistribution',
          'name': 'base',
          'currency': d.currency,
          'duration': 'P1Y',
          'percentile10': d.bands.junior.min,
          'median': d.bands.senior.median,
          'percentile90': d.bands.lead.max
        }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': url + '#breadcrumbs',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://certquests.com/' },
          { '@type': 'ListItem', 'position': 2, 'name': 'Salaires', 'item': 'https://certquests.com/salaire/' },
          { '@type': 'ListItem', 'position': 3, 'name': d.certTitle, 'item': `https://certquests.com/salaire/${d.cert}/` },
          { '@type': 'ListItem', 'position': 4, 'name': d.countryLabel, 'item': url }
        ]
      }
    ]
  };
}

function capDesc(s, max = 160) {
  if (!s) return '';
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return (at > max * 0.7 ? cut.slice(0, at) : cut).replace(/[ ,;:.\-—]+$/, '') + '…';
}

function renderPage(d) {
  const sym = d.currencySymbol || '€';
  const payback = paybackMonths(d.roi);
  const ld = jsonLd(d, payback);
  const certLink = `/certifications/`;
  const trainLink = `/train.html?pack=${esc(d.cert.replace(/^aws-saa$/, 'aws-saa-c03'))}`;

  const bandHtml = ['junior','senior','lead'].map(tier => {
    const b = d.bands[tier];
    return `<div class="band-card">
      <div class="band-tier">${esc(tier.charAt(0).toUpperCase() + tier.slice(1))}</div>
      <div class="band-median">${fmtMoney(b.median, d.currency, sym)}</div>
      <div class="band-range">Range ${fmtMoney(b.min, d.currency, sym)} – ${fmtMoney(b.max, d.currency, sym)}</div>
      <div class="band-yoe">${esc(b.yoe || '')}</div>
    </div>`;
  }).join('');

  const jobsHtml = (d.jobTypes || [])
    .map(j => `<span class="job-chip">${esc(j)}</span>`).join('');

  const timelineHtml = (d.progression5y || []).map(step => `
    <div class="timeline-row">
      <span class="y">Year ${step.year}</span>
      <span class="t">${esc(step.title)}</span>
      <span class="s">${fmtMoney(step.salary, d.currency, sym)}</span>
    </div>`).join('');

  const compareHtml = (d.comparison || []).map(row => {
    const here = (row.country.toLowerCase() === d.countryLabel.toLowerCase()) ? ' here' : '';
    const symRow = row.currency === 'EUR' ? '€' : (row.currency === 'CAD' ? 'CA$' : '');
    return `<tr class="${here}">
      <td class="country">${esc(row.country)}</td>
      <td class="median">${fmtMoney(row.median, row.currency, symRow)}</td>
      <td>${esc(row.currency)}</td>
    </tr>`;
  }).join('');

  const sourcesHtml = (d.sources || []).map(s =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>${s.snapshot ? ` <small>(<a href="${esc(s.snapshot)}" target="_blank" rel="noopener">archive</a>)</small>` : ''}</li>`
  ).join('');

  const total = (d.roi.examCostEur || 0) + (d.roi.studyHours || 0) * (d.roi.hourlyOpportunityCostEur || 0);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>${esc(d.certTitle)} — Salaire ${esc(d.countryLabel)} 2026 · CertQuests</title>
  <meta name="description" content="${esc(capDesc(`Salaires ${d.certTitle} en ${d.countryLabel} : fourchettes junior/senior/lead, ROI et progression carrière. Sources APEC, LinkedIn, Glassdoor — révisé ${d.lastReviewed}.`))}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="https://certquests.com/salaire/${esc(d.cert)}/${esc(d.country)}/" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://certquests.com/salaire/${esc(d.cert)}/${esc(d.country)}/" />
  <meta property="og:title" content="${esc(d.certTitle)} — Salaire ${esc(d.countryLabel)} 2026" />
  <meta property="og:description" content="Fourchettes salariales junior/senior/lead, postes accessibles, ROI de la certification — révisé ${esc(d.lastReviewed)}." />
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

<main class="salary-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span><a href="/salaire/">Salaires</a><span>/</span>${esc(d.certTitle)} — ${esc(d.countryLabel)}
  </nav>

  <section class="salary-hero">
    <span class="eyebrow">💶 Salaire · ${esc(d.countryLabel)}</span>
    <h1>${esc(d.certTitle)} <br><span class="grad">${fmtMoney(d.bands.senior.median, d.currency, sym)} médiane</span> en ${esc(d.countryLabel)}</h1>
    <p class="lede">Fourchettes réelles, postes accessibles, et progression sur 5 ans. ROI calculé : la certif se rembourse en ${payback || '—'} mois.</p>
    <div class="salary-meta">
      <span class="pill fresh">Révisé ${esc(d.lastReviewed)}</span>
      <span class="pill">Devise ${esc(d.currency)}</span>
      <span class="pill">${(d.sources || []).length} sources</span>
    </div>
  </section>

  <section class="salary-section">
    <h2>Fourchettes par séniorité</h2>
    <p>Médiane affichée; fourchette = quartiles bas/haut, pas les extrêmes. Les chiffres reflètent les postes <em>${esc(d.countryLabel)} en CDI</em>.</p>
    <div class="bands-grid">${bandHtml}</div>
  </section>

  <section class="salary-section">
    <h2>Postes accessibles avec cette certification</h2>
    <div class="jobs-list">${jobsHtml}</div>
  </section>

  <section class="salary-section">
    <h2>Progression carrière sur 5 ans</h2>
    <p>Trajectoire réaliste — ces marches supposent que la certif est combinée à de l'expérience opérationnelle, pas isolée.</p>
    <div class="timeline">${timelineHtml}</div>
  </section>

  <section class="salary-section">
    <h2>Comparatif par pays</h2>
    <p>Médiane senior (${esc(d.bands.senior.yoe)}) pour le même profil. Devises locales — pas de conversion forcée.</p>
    <table class="compare-table"><thead><tr><th>Pays</th><th>Médiane</th><th>Devise</th></tr></thead><tbody>${compareHtml}</tbody></table>
  </section>

  <section class="salary-section">
    <h2>ROI : combien de temps pour rembourser la certif ?</h2>
    <div class="roi-card">
      <div>
        <div class="roi-figure">${payback ? payback + ' mois' : '—'}</div>
        <div class="roi-sub">temps de retour sur investissement</div>
      </div>
      <ul>
        <li>Examen : <strong>${fmtMoney(d.roi.examCostEur, 'EUR', sym)}</strong></li>
        <li>Étude : ${d.roi.studyHours}h × ${sym}${d.roi.hourlyOpportunityCostEur}/h = <strong>${fmtMoney(d.roi.studyHours * d.roi.hourlyOpportunityCostEur, 'EUR', sym)}</strong></li>
        <li>Investissement total : <strong>${fmtMoney(total, 'EUR', sym)}</strong></li>
        <li>Salaire annuel additionnel : <strong>${fmtMoney(d.roi.annualSalaryUpliftEur, 'EUR', sym)}</strong></li>
      </ul>
    </div>
    <div class="cta-row">
      <a class="primary" href="${trainLink}">⚡ S'entraîner sur ${esc(d.cert.toUpperCase().replace('-', ' '))}</a>
      <a class="secondary" href="${certLink}">Voir toutes les certifs</a>
    </div>
  </section>

  <div class="sources">
    <h3>Sources</h3>
    <ul>${sourcesHtml}</ul>
    <p class="disclaimer">Données indicatives, pas une garantie d'embauche. Les fourchettes varient selon la ville (Paris/IDF +10–20%), le secteur (banque, conseil = +15%) et le télétravail. Vérifier directement avec les sources avant de prendre une décision carrière.</p>
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
  const cards = items.map(d => {
    const sym = d.currencySymbol || '€';
    return `<a class="salary-card" href="/salaire/${esc(d.cert)}/${esc(d.country)}/">
      <div class="salary-card-flag">${esc(d.countryLabel)}</div>
      <div class="salary-card-title">${esc(d.certTitle)}</div>
      <div class="salary-card-median"><span class="lbl">Médiane senior</span> <span class="val">${fmtMoney(d.bands.senior.median, d.currency, sym)}</span></div>
      <div class="salary-card-meta">Révisé ${esc(d.lastReviewed)} · ${esc(d.currency)}</div>
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>Salaires des certifications IT — par cert et par pays · CertQuests</title>
  <meta name="description" content="Fourchettes salariales réelles pour les certifications IT (AWS, Cisco, Red Hat…) par pays. Sources APEC, LinkedIn, Glassdoor — revues régulièrement." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://certquests.com/salaire/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://certquests.com/salaire/" />
  <meta property="og:title" content="Salaires des certifications IT — par cert et par pays · CertQuests" />
  <meta property="og:description" content="Fourchettes salariales réelles pour les certifications IT (AWS, Cisco, Red Hat…) par pays. Sources APEC, LinkedIn, Glassdoor — revues régulièrement." />
  <meta property="og:image" content="https://certquests.com/src/assets/og/og-default.png?v=1" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://certquests.com/src/assets/og/og-default.png?v=1" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" href="/favicon.ico?v=4" sizes="any" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/src/styles/main.css?${CACHE_BUST}" />
  <link rel="stylesheet" href="/src/styles/desktop.css?${CACHE_BUST}" />
  ${SHARED_STYLE}
  <style>
    .salary-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:14px; margin-top:18px; }
    .salary-card { display:flex; flex-direction:column; gap:6px; padding:18px; background:linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.005)); border:1px solid rgba(255,255,255,.07); border-left:3px solid #a78bfa; border-radius:14px; text-decoration:none; color:inherit; transition:transform .18s, border-color .18s, box-shadow .18s; }
    .salary-card:hover { transform:translateY(-2px); border-color:rgba(255,255,255,.18); box-shadow:0 14px 30px -16px rgba(0,0,0,.6); }
    .salary-card-flag { font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:#a78bfa; }
    .salary-card-title { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:15px; color:#f1f5fb; line-height:1.3; }
    .salary-card-median { display:flex; align-items:baseline; gap:6px; margin-top:auto; padding-top:6px; }
    .salary-card-median .lbl { font-size:11.5px; color:#7c90ae; }
    .salary-card-median .val { font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:800; color:#fbbf24; }
    .salary-card-meta { font-family:'JetBrains Mono',monospace; font-size:10.5px; color:#506885; }
  </style>
</head>
<body>
${HEADER}

<main class="salary-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span>Salaires
  </nav>

  <section class="salary-hero">
    <span class="eyebrow">💶 Salaires · IT</span>
    <h1>Combien gagne un certifié <span class="grad">en vrai ?</span></h1>
    <p class="lede">Fourchettes réelles par certification, par pays. Sources publiques (APEC, LinkedIn Salary Insights, Glassdoor, STATEC) — pas de promesses gonflées.</p>
    <div class="salary-meta">
      <span class="pill fresh">${items.length} pages publiées</span>
      <span class="pill">Mis à jour trimestriellement</span>
    </div>
    <div class="cta-row">
      <a class="primary" href="/salary-predictor/">📈 Estime ton salaire après la certif →</a>
    </div>
  </section>

  <section class="salary-section">
    <h2>Pages disponibles</h2>
    <div class="salary-grid">${cards}</div>
    <p style="margin-top:18px; font-size:13px; color:#7c90ae;">Plus de pages ajoutées au fil de la mise à jour trimestrielle des données. Demande une cert/pays via <a href="/contact.html" style="color:#60a5fa">/contact.html</a>.</p>
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
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();
  const datasets = files.map(f => {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
    return raw;
  });

  let written = 0;
  for (const d of datasets) {
    const dir = path.join(OUT_DIR, d.cert, d.country);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPage(d), 'utf8');
    written++;
    console.log('wrote', path.relative(ROOT, path.join(dir, 'index.html')));
  }

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderIndex(datasets), 'utf8');
  console.log('wrote', path.relative(ROOT, path.join(OUT_DIR, 'index.html')));

  console.log(`gen-salary: ${written} pages + 1 index`);
}

main();
