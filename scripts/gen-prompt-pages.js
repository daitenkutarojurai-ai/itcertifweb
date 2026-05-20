#!/usr/bin/env node
/**
 * scripts/gen-prompt-pages.js — Phase 6.10 (PromptDungeon)
 *
 * Reads every `data/prompts/<slug>.json` and emits:
 *   - prompt-dungeon/<slug>/index.html — workflow detail with prompts
 *   - prompt-dungeon/index.html        — grid of workflows + filters
 *
 * Run: `node scripts/gen-prompt-pages.js` (or `npm run gen-prompts`).
 * Idempotent — overwrites generated HTML on every run.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'prompts');
const OUT_DIR  = path.join(ROOT, 'prompt-dungeon');

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

const SHARED_STYLE = `<style>
.pd-page { max-width: 920px; margin: 0 auto; padding: 0 20px 80px; color: #e8edf8; }
.breadcrumb { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#506885; padding:14px 0 0; }
.breadcrumb a { color:#7c90ae; text-decoration:none; }
.breadcrumb a:hover { color:#e8edf8; }
.breadcrumb span { color:#7c90ae; margin:0 8px; }

.pd-hero { padding: 32px 8px 8px; }
.pd-hero .eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; padding:5px 14px; border-radius:999px; margin-bottom:14px; }
.pd-hero h1 { font-family:'Space Grotesk',sans-serif; font-size:clamp(28px,4.4vw,42px); font-weight:800; letter-spacing:-.02em; margin:0 0 8px; line-height:1.15; color:#f1f5fb; }
.pd-hero h1 .grad { background: linear-gradient(135deg, #c084fc 0%, #60a5fa 60%, #34d399 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; }
.pd-hero .lede { font-size:16px; line-height:1.6; color:#a8b6d1; max-width:760px; margin:0; }

.pd-meta { display:flex; flex-wrap:wrap; gap:8px; margin: 14px 0 4px; font-size:12px; color:#7c90ae; font-family:'JetBrains Mono',monospace; }
.pd-meta .pill { padding:4px 10px; border-radius:999px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); }
.pd-meta .pill.fresh { color:#6ee7b7; border-color:rgba(52,211,153,.3); background:rgba(52,211,153,.08); }
.pd-meta .pill.warn  { color:#fbbf24; border-color:rgba(251,191,36,.3); background:rgba(251,191,36,.08); }
.pd-meta .pill.stale { color:#f87171; border-color:rgba(248,113,113,.3); background:rgba(248,113,113,.08); }
.pd-meta .pill.tag   { color:#a8b6d1; }
.pd-meta .pill.model { color:#c084fc; border-color:rgba(192,132,252,.3); background:rgba(192,132,252,.08); }

.pd-disclaimer { margin: 18px 0 0; padding: 12px 14px; background: rgba(251,191,36,.06); border:1px solid rgba(251,191,36,.22); border-radius: 10px; color:#fde68a; font-size: 12.5px; line-height: 1.55; }

/* Prompt card */
.prompt { margin: 18px 0; padding: 20px; background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.07); border-left: 4px solid var(--pd-color, #c084fc); border-radius: 14px; }
.prompt-anchor { display:block; height: 0; margin-top: -90px; padding-top: 90px; }
.prompt h3 { font-family:'Space Grotesk',sans-serif; font-size: 18px; font-weight: 700; color: #f1f5fb; line-height: 1.3; margin: 0 0 6px; }
.prompt .prompt-use { font-size: 13.5px; color:#cbd5e1; line-height: 1.55; margin: 0 0 14px; }
.prompt-models { display:flex; flex-wrap:wrap; gap:6px; margin: 0 0 12px; }
.prompt-models .chip { font-family:'JetBrains Mono',monospace; font-size: 10.5px; padding: 3px 9px; border-radius: 999px; color:#a8b6d1; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); }

.prompt-box { position: relative; margin: 0; }
.prompt-box pre { margin: 0; padding: 16px 18px; background: rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.05); border-radius: 12px; color: #e8edf8; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 13px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; overflow-x: auto; }
.prompt-box pre code { background: transparent; padding: 0; }
.prompt-copy { position: absolute; top: 10px; right: 10px; padding: 6px 12px; background: rgba(192,132,252,.18); border: 1px solid rgba(192,132,252,.4); border-radius: 8px; color: #e8d9ff; font-family: 'JetBrains Mono', monospace; font-size: 11px; cursor: pointer; transition: background .15s; min-height: 32px; }
.prompt-copy:hover { background: rgba(192,132,252,.30); }
.prompt-copy.ok { background: rgba(52,211,153,.20); border-color: rgba(52,211,153,.5); color:#a7f3d0; }

.prompt-tips { margin: 12px 0 0; padding: 10px 14px; background: rgba(96,165,250,.08); border: 1px solid rgba(96,165,250,.25); border-radius: 10px; color: #c7d8f7; font-size: 12.5px; line-height: 1.55; }
.prompt-tips strong { color: #60a5fa; font-family:'JetBrains Mono',monospace; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; display: block; margin-bottom: 3px; }

.pd-toc { margin: 22px 0 0; padding: 16px 18px; background:rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.06); border-radius: 12px; }
.pd-toc h3 { font-family:'JetBrains Mono',monospace; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #7c90ae; margin: 0 0 8px; }
.pd-toc ol { margin: 0; padding-left: 22px; }
.pd-toc li { margin-bottom: 4px; }
.pd-toc a { color: #c084fc; text-decoration: none; font-size: 13.5px; }
.pd-toc a:hover { text-decoration: underline; }

.pd-explain { margin-top: 30px; padding: 18px; background: rgba(0,0,0,.2); border: 1px solid rgba(255,255,255,.05); border-radius: 12px; color: #a8b6d1; font-size: 13px; line-height: 1.65; }
.pd-explain h3 { font-family:'JetBrains Mono',monospace; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #7c90ae; margin: 14px 0 8px; }
.pd-explain h3:first-child { margin-top: 0; }
.pd-explain p { margin: 0 0 8px; }
.pd-explain a { color: #60a5fa; }
</style>`;

function freshnessClass(lastReviewed) {
  try {
    const [y, m] = lastReviewed.split('-').map(Number);
    const reviewed = new Date(y, m - 1, 1);
    const now = new Date();
    const months = (now.getFullYear() - reviewed.getFullYear()) * 12 + (now.getMonth() - reviewed.getMonth());
    if (months <= 3) return { cls: 'fresh', label: 'Tested ' + lastReviewed };
    if (months <= 9) return { cls: 'warn',  label: 'Tested ' + lastReviewed };
    return                       { cls: 'stale', label: '⚠ Old (' + lastReviewed + ')' };
  } catch (_) {
    return { cls: 'warn', label: lastReviewed || '—' };
  }
}

function workflowJsonLd(d) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    'name': d.title,
    'description': d.tldr,
    'datePublished': d.lastReviewed + '-01',
    'dateModified':  d.lastReviewed + '-01',
    'url': `https://certquests.com/prompt-dungeon/${d.slug}/`,
    'totalTime': 'PT' + (d.prompts.length * 5) + 'M',
    'step': d.prompts.map((p, i) => ({
      '@type': 'HowToStep',
      'position': i + 1,
      'name': p.title,
      'text': p.use_case
    }))
  };
}

function renderPromptCard(p, idx, color) {
  const id = esc(p.id);
  const models = (p.model_tested || []).map(m =>
    `<span class="chip">${esc(m)}</span>`
  ).join('');
  const tips = p.tips
    ? `<div class="prompt-tips"><strong>Tip</strong>${esc(p.tips)}</div>`
    : '';
  return `<article class="prompt" style="--pd-color:${esc(color)}">
    <span class="prompt-anchor" id="prompt-${id}"></span>
    <h3><a href="#prompt-${id}" style="color:inherit;text-decoration:none">${idx + 1}. ${esc(p.title)}</a></h3>
    <p class="prompt-use">${esc(p.use_case)}</p>
    <div class="prompt-models">${models}</div>
    <div class="prompt-box">
      <button type="button" class="prompt-copy" data-target="prompt-text-${id}" aria-label="Copy prompt to clipboard">Copy</button>
      <pre><code id="prompt-text-${id}">${esc(p.prompt)}</code></pre>
    </div>
    ${tips}
  </article>`;
}

function renderWorkflow(d) {
  const ld = workflowJsonLd(d);
  const fresh = freshnessClass(d.lastReviewed);
  const tagsHtml = (d.tags || []).map(t => `<span class="pill tag">#${esc(t)}</span>`).join('');
  const modelsHtml = (d.models || []).map(m => `<span class="pill model">${esc(m)}</span>`).join('');
  const tocHtml = d.prompts.map((p, i) =>
    `<li><a href="#prompt-${esc(p.id)}">${i + 1}. ${esc(p.title)}</a></li>`
  ).join('');
  const promptsHtml = d.prompts.map((p, i) => renderPromptCard(p, i, d.color)).join('');
  const disclaimer = d.disclaimer
    ? `<div class="pd-disclaimer"><strong>Honest note —</strong> ${esc(d.disclaimer)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>${esc(d.title)} — PromptDungeon · CertQuests</title>
  <meta name="description" content="${esc(d.tldr)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="https://certquests.com/prompt-dungeon/${esc(d.slug)}/" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://certquests.com/prompt-dungeon/${esc(d.slug)}/" />
  <meta property="og:title" content="${esc(d.title)} — battle-tested AI prompts" />
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

<main class="pd-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span><a href="/prompt-dungeon/">PromptDungeon</a><span>/</span>${esc(d.title)}
  </nav>

  <section class="pd-hero">
    <span class="eyebrow" style="color:${esc(d.color)};background:${esc(d.color)}1a;border:1px solid ${esc(d.color)}55">${esc(d.icon)} ${esc(d.vendor)}</span>
    <h1>${esc(d.title)} <span class="grad">prompts</span></h1>
    <p class="lede">${esc(d.tldr)}</p>
    <div class="pd-meta">
      <span class="pill ${fresh.cls}">${esc(fresh.label)}</span>
      ${modelsHtml}
      ${tagsHtml}
    </div>
    ${disclaimer}
  </section>

  <div class="pd-toc">
    <h3>Prompts in this set</h3>
    <ol>${tocHtml}</ol>
  </div>

  ${promptsHtml}

  <div class="pd-explain">
    <h3>How to use these prompts</h3>
    <p>Each prompt has placeholders in <code>&lt;ANGLE_BRACKETS&gt;</code> — fill them in before pasting. Copy the prompt with the button, paste into Claude, ChatGPT, Gemini, or any chat-UI'd LLM.</p>
    <h3>Why "model tested" dates matter</h3>
    <p>LLMs improve and regress with every release. A prompt that worked on Claude 3.5 may need rewriting for Claude 4. The dates show when each prompt was last verified — anything older than 6 months should be re-tested before depending on it.</p>
    <h3>Found a better prompt?</h3>
    <p>Hit <a href="/contact.html">contact</a> and share — we keep prompts that beat ours.</p>
  </div>
</main>

${FOOTER}

<script>
/* Copy-to-clipboard for each prompt card */
(function () {
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.prompt-copy');
    if (!btn) return;
    var targetId = btn.getAttribute('data-target');
    var target = document.getElementById(targetId);
    if (!target) return;
    var text = target.textContent || '';
    function done() {
      var old = btn.textContent;
      btn.textContent = 'Copied ✓';
      btn.classList.add('ok');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('ok'); }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { /* swallow */ });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (_) {}
      document.body.removeChild(ta);
    }
  });
})();
</script>

<script src="/src/cq-core.js?${CACHE_BUST}" defer></script>
<script src="/src/mascot-loader.js?${CACHE_BUST}" defer></script>
</body>
</html>
`;
}

function renderIndex(datasets) {
  const allTags = Array.from(new Set(datasets.flatMap(d => d.tags || []))).sort();
  const tagFilters = allTags.map(t =>
    `<button type="button" class="pd-tag-filter" data-tag="${esc(t)}">#${esc(t)}</button>`
  ).join('');

  const cards = datasets.map(d => {
    const tagList = (d.tags || []).join(' ');
    return `<a class="pd-card" href="/prompt-dungeon/${esc(d.slug)}/" data-tags="${esc(tagList)}" style="--pd-color:${esc(d.color)}">
      <div class="pd-card-head">
        <span class="pd-card-icon">${esc(d.icon)}</span>
        <span class="pd-card-vendor">${esc(d.vendor)}</span>
      </div>
      <div class="pd-card-title">${esc(d.title)}</div>
      <div class="pd-card-tldr">${esc(d.tldr)}</div>
      <div class="pd-card-meta">${d.prompts.length} prompts · Tested ${esc(d.lastReviewed)}</div>
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06080f" />
  <title>PromptDungeon — Battle-tested AI prompts for tech workflows · CertQuests</title>
  <meta name="description" content="Hand-written, model-tested prompts for AWS cert prep, IT CV writing, YouTube tech shorts, recruiter sourcing. Copy-paste ready, dated by model + last-verified date. No fluff." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://certquests.com/prompt-dungeon/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://certquests.com/prompt-dungeon/" />
  <meta property="og:title" content="PromptDungeon — Battle-tested AI prompts" />
  <meta property="og:description" content="Hand-written prompts for tech workflows. Copy-paste ready." />
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
    .pd-filters { display:flex; flex-wrap:wrap; gap:6px; margin: 18px 0 0; }
    .pd-tag-filter { font-family:'JetBrains Mono',monospace; font-size: 11px; padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); color: #a8b6d1; cursor: pointer; min-height: 32px; }
    .pd-tag-filter:hover { background: rgba(192,132,252,.10); border-color: rgba(192,132,252,.32); color: #c084fc; }
    .pd-tag-filter.is-active { background: rgba(192,132,252,.18); border-color: rgba(192,132,252,.5); color: #e8d9ff; }

    .pd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; margin-top: 18px; }
    .pd-card { display: flex; flex-direction: column; gap: 8px; padding: 18px; background: linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.005)); border: 1px solid rgba(255,255,255,.07); border-left: 3px solid var(--pd-color, #c084fc); border-radius: 14px; text-decoration: none; color: inherit; transition: transform .18s, border-color .18s, box-shadow .18s; }
    .pd-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.18); box-shadow: 0 14px 30px -16px rgba(0,0,0,.6); }
    .pd-card[hidden] { display: none !important; }
    .pd-card-head { display: flex; align-items: center; gap: 8px; }
    .pd-card-icon { font-size: 22px; }
    .pd-card-vendor { font-family:'JetBrains Mono',monospace; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--pd-color, #c084fc); }
    .pd-card-title { font-family:'Space Grotesk',sans-serif; font-weight: 700; font-size: 17px; color: #f1f5fb; line-height: 1.25; }
    .pd-card-tldr { font-size: 13px; color: #a8b6d1; line-height: 1.55; }
    .pd-card-meta { font-family:'JetBrains Mono',monospace; font-size: 10.5px; color: #506885; margin-top: auto; padding-top: 6px; }
  </style>
</head>
<body>
${HEADER}

<main class="pd-page" id="main-content">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span>PromptDungeon
  </nav>

  <section class="pd-hero">
    <span class="eyebrow" style="color:#c084fc;background:rgba(192,132,252,.10);border:1px solid rgba(192,132,252,.32)">🧙 PromptDungeon</span>
    <h1>Battle-tested AI <span class="grad">prompts</span> for tech work</h1>
    <p class="lede">Hand-written prompts for AWS cert prep, IT CV writing, YouTube shorts, recruiter sourcing. Each one is dated by the model it was tested on and the month it was last verified. No "10 ChatGPT prompts that will change your life" garbage — just things that actually work.</p>
    <div class="pd-filters" role="group" aria-label="Filter by tag">
      <button type="button" class="pd-tag-filter is-active" data-tag="">All</button>
      ${tagFilters}
    </div>
  </section>

  <section>
    <div class="pd-grid" id="pd-grid">${cards}</div>
  </section>

  <div class="pd-explain">
    <h3>What's a "battle-tested" prompt?</h3>
    <p>A prompt is battle-tested when it produces useful output across multiple models, multiple times, on multiple variations of the input. We don't ship prompts that worked once on one model — we ship the ones we keep coming back to.</p>
    <h3>Why so few prompts per workflow?</h3>
    <p>Quality &gt; quantity. 4-6 prompts that solve real problems beat 50 generic "act as a professional X" templates. If you can name the problem in one sentence, the prompt is worth shipping; if not, it isn't.</p>
    <h3>Model-tested dates</h3>
    <p>Every prompt lists the models + dates it was verified against. LLMs change quarterly — re-test any prompt older than 6 months before depending on it.</p>
  </div>
</main>

${FOOTER}

<script>
/* Tag filter — click filters the grid in-place */
(function () {
  var filters = document.querySelectorAll('.pd-tag-filter');
  var cards = document.querySelectorAll('.pd-card');
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
    console.error('No data/prompts directory found.');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).sort();
  const datasets = files.map(f => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')));

  let written = 0;
  for (const d of datasets) {
    const dir = path.join(OUT_DIR, d.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderWorkflow(d), 'utf8');
    console.log('wrote', path.relative(ROOT, path.join(dir, 'index.html')));
    written++;
  }
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderIndex(datasets), 'utf8');
  console.log('wrote', path.relative(ROOT, path.join(OUT_DIR, 'index.html')));
  console.log(`gen-prompts: ${written} workflow pages + 1 index`);
}

main();
