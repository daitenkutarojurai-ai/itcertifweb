#!/usr/bin/env node
/**
 * scripts/cert-pack-ctas.js — regenerates the <div class="pack-grid">…</div>
 * block on each certifications/<brand>.html using data/index.json as the
 * single source of truth.
 *
 * Why a full regen: the previous incremental rewriter could not promote a
 * pack from "Coming soon" to "Live" once the data flipped — the brand HTML
 * still had a hand-written <span class="pack-tile unavailable"> stub. With
 * data/index.json now driving the cert grid, freshly-shipped packs surface
 * on the brand page the next time this script runs.
 *
 * Per-tile output:
 *   - available: <div class="pack-tile"> + chips + Start-training button
 *     (wired to src/pack-picker.js) + optional Learning Path link
 *   - coming soon: <span class="pack-tile unavailable">…</span>
 *
 * Idempotent. Re-running on already-regenerated files is a no-op when the
 * data is unchanged.
 *
 * Run: `node scripts/cert-pack-ctas.js` (or `npm run cert-pack-ctas`).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CERT_DIR = path.join(ROOT, 'certifications');
const PATHS_INDEX = path.join(ROOT, 'data', 'paths', '_index.json');
const DATA_INDEX = path.join(ROOT, 'data', 'index.json');

const idx = JSON.parse(fs.readFileSync(DATA_INDEX, 'utf8'));
const pathPacks = new Set(
  JSON.parse(fs.readFileSync(PATHS_INDEX, 'utf8')).map(p => p.packId)
);

// data/index.json uses display IDs (e.g. aws-clf-c02) that point at a file
// basename (e.g. aws-cloud-practitioner) — the path system keys on the file
// basename. Build the id→canonical-packId map so the Learning Path CTA
// links to the right /path.html?pack=… target.
const aliasMap = {};
(idx.brands || []).forEach(b => (b.packs || []).forEach(p => {
  const file = String(p.file || '').replace(/^free\//, '').replace(/\.json$/, '');
  if (file && file !== p.id) aliasMap[p.id] = file;
}));

function pathPackIdFor(displayId) {
  return aliasMap[displayId] || displayId;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTile(brand, pack) {
  const name      = escapeHtml(pack.name);
  const qCount    = pack.question_count || 0;
  const fullCount = pack.full_count || qCount;
  const difficulty = escapeHtml(pack.difficulty || 'intermediate');
  const hours     = pack.est_hours ? `~${pack.est_hours}h study` : null;
  const chipsMeta = [
    `<span class="chip">${qCount} questions</span>`,
    `<span class="chip">${difficulty}</span>`,
    hours ? `<span class="chip">${hours}</span>` : null,
  ].filter(Boolean).join('\n        ');

  if (!pack.available) {
    return `
    <span class="pack-tile unavailable" aria-disabled="true" tabindex="-1" role="link">
      <div class="pack-tile-name">${name}</div>
      <div class="pack-tile-meta">
        <span class="chip soon">Coming soon</span>
        ${chipsMeta}
      </div>
      <div class="pack-tile-cta">Coming soon</div>
    </span>`;
  }

  const pathId = pathPackIdFor(pack.id);
  const hasPath = pathPacks.has(pathId);
  // Always emit a secondary slot so every tile shares the same grid layout.
  // When no path exists yet, render a disabled "Learning path soon" tag in
  // place of the live link.
  const learn = hasPath
    ? `<a href="/path.html?pack=${pathId}" class="pack-cta pack-cta-secondary">🗺️ Learning path</a>`
    : `<span class="pack-cta pack-cta-secondary pack-cta-disabled" aria-disabled="true" title="Learning path coming soon">🗺️ Path soon</span>`;
  const startBtn = `<button type="button" class="pack-cta pack-cta-primary" data-pack-picker
        data-pack="${escapeHtml(pack.id)}"
        data-name="${name}"
        data-brand="${escapeHtml(brand.name)}"
        data-question-count="${qCount}"
        data-full-count="${fullCount}">🚀 Start training</button>`;

  return `
    <div class="pack-tile">
      <div class="pack-tile-name">${name}</div>
      <div class="pack-tile-meta">
        <span class="chip live">Live now</span>
        ${chipsMeta}
      </div>
      <div class="pack-cta-row">${startBtn}${learn}</div>
    </div>`;
}

function renderGrid(brand) {
  const tiles = brand.packs.map(p => renderTile(brand, p)).join('\n');
  return `<div class="pack-grid">${tiles}\n    </div>`;
}

// Match the whole pack-grid container; non-greedy until first </div></section>
const GRID_RE = /<div class="pack-grid">[\s\S]*?\n\s*<\/div>(\s*<\/section>)/;

// Pull the brand stripe colour from `.pack-tile::before { … background: #… }`
// so the primary CTA inherits the brand hue.
const BRAND_BLOCK_RE = /\.pack-tile::before\s*\{[^}]*\}/;
function brandColorFor(src) {
  const m = src.match(BRAND_BLOCK_RE);
  if (!m) return null;
  const c = m[0].match(/background:\s*(#[0-9a-fA-F]+)/);
  return c ? c[1] : null;
}
function ensureBrandVar(src, brand) {
  if (!brand) return src;
  const decl = `--pack-brand: ${brand};`;
  if (/--pack-brand:\s*#[0-9a-fA-F]+;/.test(src)) {
    return src.replace(/--pack-brand:\s*#[0-9a-fA-F]+;/, decl);
  }
  return src.replace(/(\.pack-tile\s*\{)(\s*)/, `$1\n      ${decl}$2`);
}

// Inject `<script src="/src/pack-picker.js?v=…" defer></script>` once per
// page (before the existing cq-core / mascot-loader scripts at end of body).
function ensurePickerScript(src) {
  if (src.includes('/src/pack-picker.js')) return src;
  const cacheV = (src.match(/cq-core\.js\?v=(\d+)/) || [])[1] || '1';
  const tag = `  <script src="/src/pack-picker.js?v=${cacheV}" defer></script>\n`;
  // Insert immediately before cq-core.js for predictable order.
  return src.replace(
    /(<script src="\/src\/cq-core\.js[^"]*"[^>]*><\/script>\n)/,
    tag + '$1'
  );
}

function rewriteFile(filePath) {
  const filename = path.basename(filePath, '.html');
  const brand = idx.brands.find(b => b.id === filename);
  if (!brand) return { file: filePath, status: 'skipped-no-brand' };

  const src = fs.readFileSync(filePath, 'utf8');
  if (!GRID_RE.test(src)) {
    return { file: filePath, status: 'skipped-no-grid' };
  }

  let out = src.replace(GRID_RE, () => renderGrid(brand) + '$1').replace('$1', '\n  </section>');
  // The single-shot .replace + $1 dance is unreliable across regex engines; do
  // it in two passes for clarity.
  out = src.replace(GRID_RE, (_full, tail) => renderGrid(brand) + tail);
  out = ensureBrandVar(out, brandColorFor(out));
  out = ensurePickerScript(out);

  if (out === src) return { file: filePath, status: 'unchanged', tiles: brand.packs.length };
  fs.writeFileSync(filePath, out, 'utf8');
  return { file: filePath, status: 'updated', tiles: brand.packs.length };
}

function main() {
  const files = fs.readdirSync(CERT_DIR)
    .filter(n => n.endsWith('.html') && n !== 'index.html')
    .map(n => path.join(CERT_DIR, n));
  let touched = 0, totalTiles = 0;
  for (const f of files) {
    const r = rewriteFile(f);
    if (r.status === 'updated') {
      touched++;
      totalTiles += r.tiles;
      console.log(`updated ${path.relative(ROOT, f)}: ${r.tiles} tiles`);
    } else {
      console.log(`${r.status} ${path.relative(ROOT, f)}`);
    }
  }
  console.log(`cert-pack-ctas: ${touched} files updated, ${totalTiles} tiles total`);
}

main();
