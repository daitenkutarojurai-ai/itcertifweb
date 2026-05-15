#!/usr/bin/env node
/**
 * scripts/cert-pack-ctas.js — Phase 5.10 (cert-page CTA rework).
 *
 * Each cert page (certifications/*.html) lists packs as
 *   <a href="/train.html?pack=X" class="pack-tile">…</a>
 *
 * Phase 5.10 collapses /train.html landing into /certifications/ and
 * exposes BOTH play modes per pack: Quick Quiz and Learning Path.
 * This script rewrites each available pack tile into a non-anchor
 * card with two CTA buttons at the bottom; the Learning Path button
 * is omitted when no path exists in data/paths/_index.json.
 *
 * Idempotent — re-running on already-rewritten files is a no-op.
 *
 * Run: `node scripts/cert-pack-ctas.js` (or `npm run cert-pack-ctas`).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CERT_DIR = path.join(ROOT, 'certifications');
const PATHS_INDEX = path.join(ROOT, 'data', 'paths', '_index.json');
const DATA_INDEX = path.join(ROOT, 'data', 'index.json');

const pathPacks = new Set(
  JSON.parse(fs.readFileSync(PATHS_INDEX, 'utf8')).map(p => p.packId)
);

// data/index.json uses display IDs (e.g. aws-clf-c02) that point at a
// file basename (e.g. aws-cloud-practitioner) — the path system keys
// on the file basename. Build the id→canonical-packId map so the
// Learning Path CTA links to the right /path.html?pack=… target.
const aliasMap = {};
try {
  const idx = JSON.parse(fs.readFileSync(DATA_INDEX, 'utf8'));
  (idx.brands || []).forEach(b => (b.packs || []).forEach(p => {
    const file = String(p.file || '').replace(/^free\//, '').replace(/\.json$/, '');
    if (file && file !== p.id) aliasMap[p.id] = file;
  }));
} catch (e) { /* index missing — alias map stays empty */ }

function pathPackIdFor(displayId) {
  return aliasMap[displayId] || displayId;
}

// Match: <a href="/train.html?pack=PACKID" class="pack-tile"> … </a>
// Captures pack id + inner content. Non-greedy to next </a>.
const TILE_RE = /<a\s+href="\/train\.html\?pack=([^"]+)"\s+class="pack-tile"\s*>([\s\S]*?)<\/a>/g;
// Match the inner placeholder CTA we want to swap out.
const INNER_CTA_RE = /<div\s+class="pack-tile-cta"\s*>[\s\S]*?<\/div>/;

function buildCtaRow(displayId) {
  const pathId = pathPackIdFor(displayId);
  const hasPath = pathPacks.has(pathId);
  const quick = `<a href="/train.html?pack=${displayId}" class="pack-cta pack-cta-primary">🎯 Quick quiz</a>`;
  const learn = hasPath
    ? `<a href="/path.html?pack=${pathId}" class="pack-cta pack-cta-secondary">🗺️ Learning path</a>`
    : '';
  return `<div class="pack-cta-row">${quick}${learn}</div>`;
}

// Pull the brand stripe colour out of `.pack-tile::before { … background: #… }`
// so we can wire `--pack-brand` and the primary CTA inherits the right hue
// per cert page.
const BRAND_BLOCK_RE = /\.pack-tile::before\s*\{[^}]*\}/;
function brandColorFor(src) {
  const m = src.match(BRAND_BLOCK_RE);
  if (!m) return null;
  const c = m[0].match(/background:\s*(#[0-9a-fA-F]+)/);
  return c ? c[1] : null;
}

// Inject (or refresh) `--pack-brand` on `.pack-tile { … }` so the primary
// CTA reads the correct brand colour. Idempotent.
function ensureBrandVar(src, brand) {
  if (!brand) return src;
  const decl = `--pack-brand: ${brand};`;
  // 1) Already present → refresh value in case it drifted.
  if (/--pack-brand:\s*#[0-9a-fA-F]+;/.test(src)) {
    return src.replace(/--pack-brand:\s*#[0-9a-fA-F]+;/, decl);
  }
  // 2) Inject as the first declaration of the .pack-tile block.
  return src.replace(/(\.pack-tile\s*\{)(\s*)/, `$1\n      ${decl}$2`);
}

function rewriteFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  let touched = 0;

  let out = src.replace(TILE_RE, (full, packId, inner) => {
    touched++;
    // Strip any existing pack-tile-cta div from the inner content.
    let cleanedInner = inner.replace(INNER_CTA_RE, '').trimEnd();
    // Reflow trailing whitespace consistently.
    cleanedInner = cleanedInner.replace(/\s+$/, '\n      ');
    const ctaRow = buildCtaRow(packId);
    return `<div class="pack-tile">${cleanedInner}${ctaRow}\n    </div>`;
  });

  out = ensureBrandVar(out, brandColorFor(out));

  if (out === src) return { file: filePath, touched: 0, status: 'unchanged' };
  fs.writeFileSync(filePath, out, 'utf8');
  return { file: filePath, touched, status: 'updated' };
}

function main() {
  const files = fs.readdirSync(CERT_DIR)
    .filter(n => n.endsWith('.html'))
    .map(n => path.join(CERT_DIR, n));
  let total = 0, files_touched = 0;
  for (const f of files) {
    const r = rewriteFile(f);
    if (r.status === 'updated') {
      files_touched++;
      total += r.touched;
      console.log(`updated ${path.relative(ROOT, f)}: ${r.touched} tiles`);
    }
  }
  console.log(`cert-pack-ctas: ${files_touched} files, ${total} tiles rewritten`);
}

main();
